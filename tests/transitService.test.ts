import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TransitService } from '../server/transit/transitService';
import { TransitApiError } from '../server/transit/transitTypes';
import { transitRequest } from '../server/transit/transitApiClient';

vi.mock('../server/transit/transitApiClient', () => ({
  transitRequest: vi.fn(),
  isTransitConfigured: vi.fn(() => true),
  getTransitConfig: vi.fn(() => ({
    configured: true,
    baseUrl: 'https://external.transitapp.com/v4',
    networkIds: ['GET|Bakersfield'],
  })),
}));

const stopA = { global_stop_id: 'GETCA:5391', stop_name: 'Chester / 36th', stop_lat: 35.3969, stop_lon: -119.0156, distance: 652, route_type: 3 };
const stopB = { global_stop_id: 'GETCA:5113', stop_name: 'GET Offices', stop_lat: 35.3919, stop_lon: -119.0255, distance: 163, route_type: 3 };

describe('TransitService', () => {
  beforeEach(() => {
    vi.mocked(transitRequest).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes nearby stops, sorted by distance and sliced to the limit', async () => {
    vi.mocked(transitRequest).mockResolvedValue({ stops: [stopA, stopB] });
    const service = new TransitService();

    const result = await service.getNearbyStops(35.39, -119.02, 1500, 5);

    expect(result.freshness.source).toBe('live');
    expect(result.stops.map((s) => s.stopId)).toEqual(['GETCA:5113', 'GETCA:5391']);
    expect(result.stops[0].distanceMeters).toBe(163);
    expect(vi.mocked(transitRequest)).toHaveBeenCalledWith(
      expect.stringContaining('/public/nearby_stops'),
      expect.objectContaining({ params: expect.objectContaining({ max_distance: 1500 }) })
    );
  });

  it('serves fresh cache hits without another upstream call', async () => {
    vi.mocked(transitRequest).mockResolvedValue({ stops: [stopB] });
    const service = new TransitService();

    const first = await service.getNearbyStops(35.39, -119.02, 1000, 5);
    const second = await service.getNearbyStops(35.39, -119.02, 1000, 5);

    expect(second.stops).toEqual(first.stops);
    expect(second.freshness.source).toBe('cache');
    expect(vi.mocked(transitRequest)).toHaveBeenCalledTimes(1);
  });

  it('deduplicates identical concurrent requests', async () => {
    vi.mocked(transitRequest).mockResolvedValue({ stops: [stopA] });
    const service = new TransitService();

    const [r1, r2] = await Promise.all([
      service.getNearbyStops(35.39, -119.02, 1000, 5),
      service.getNearbyStops(35.39, -119.02, 1000, 5),
    ]);

    expect(r1.stops).toEqual(r2.stops);
    expect(vi.mocked(transitRequest)).toHaveBeenCalledTimes(1);
  });

  it('serves stale data while rate-limited, then refreshes in the background', async () => {
    vi.useFakeTimers();
    vi.mocked(transitRequest).mockImplementation(async (_path, opts) => {
      const radius = opts?.params?.max_distance;
      if (radius === 1000) return { stops: [stopA, stopB] };
      throw new TransitApiError('TRANSIT_TEMPORARILY_UNAVAILABLE', 'upstream down', 503, false, true);
    });
    const service = new TransitService();

    const fresh = await service.getNearbyStops(35.39, -119.02, 1000, 5);
    expect(fresh.freshness.source).toBe('live');

    // Expire the cache entry and prune the limiter window, then burn all 5 slots.
    vi.advanceTimersByTime(6 * 60_000);
    await Promise.all(
      [200, 300, 400, 500, 600].map((radius) => service.getNearbyStops(35.39, -119.02, radius, 5).catch(() => null))
    );
    expect(service.getStatus().rateLimit.used).toBe(5);

    const stale = await service.getNearbyStops(35.39, -119.02, 1000, 5);
    expect(stale.freshness.source).toBe('stale');
    expect(stale.stops.map((s) => s.stopId)).toEqual(['GETCA:5113', 'GETCA:5391']);

    // Let the background refresh time out (queue entry) and return to real timers.
    vi.advanceTimersByTime(46_000);
    vi.useRealTimers();
  });

  it('rejects invalid coordinates with TRANSIT_INVALID_LOCATION', async () => {
    const service = new TransitService();
    await expect(service.planTrip(null, { lat: 0, lng: 0 })).rejects.toMatchObject({ code: 'TRANSIT_INVALID_LOCATION', status: 400 });
    await expect(service.planTrip({ lat: 91, lng: 0 }, { lat: 0, lng: 0 })).rejects.toMatchObject({ code: 'TRANSIT_INVALID_LOCATION' });
  });

  it('plans a trip, choosing the fastest result and counting alternatives', async () => {
    const plan = (duration: number, start: number, end: number) => ({
      duration,
      start_time: start,
      end_time: end,
      legs: [{ leg_mode: 'walk', duration: duration, distance: 100 }],
    });
    vi.mocked(transitRequest).mockResolvedValue({ results: [plan(5000, 1000, 6000), plan(3000, 1000, 4000)] });
    const service = new TransitService();

    const result = await service.planTrip({ lat: 35.39, lng: -119.02 }, { lat: 35.38, lng: -118.99 });

    expect(result.alternatives).toBe(1);
    expect(result.trip.totalDurationMinutes).toBe(50);
    expect(result.trip.tripId).toContain('plan-');
    const callParams = vi.mocked(transitRequest).mock.calls[0][1]?.params;
    expect(callParams).toMatchObject({ from_lat: 35.39, from_lon: -119.02, to_lat: 35.38, to_lon: -118.99 });
  });

  it('throws TRANSIT_TRIP_NOT_FOUND when no trips are returned', async () => {
    vi.mocked(transitRequest).mockResolvedValue({ results: [] });
    const service = new TransitService();
    await expect(service.planTrip({ lat: 35.39, lng: -119.02 }, { lat: 35.38, lng: -118.99 })).rejects.toMatchObject({
      code: 'TRANSIT_TRIP_NOT_FOUND',
      status: 404,
    });
  });

  it('normalizes and ranks service alerts', async () => {
    vi.mocked(transitRequest).mockResolvedValue({
      alerts: [
        { title: 'low', severity: 'Info', created_at: 1 },
        { title: 'high', severity: 'Severe', created_at: 2 },
      ],
    });
    const service = new TransitService();
    const result = await service.getServiceAlerts(35.39, -119.02);

    expect(result.alerts.map((a) => a.severity)).toEqual(['critical', 'info']);
    expect(vi.mocked(transitRequest)).toHaveBeenCalledWith(
      expect.stringContaining('/public/alerts_for_networks'),
      expect.objectContaining({ params: expect.objectContaining({ network_ids: 'GET|Bakersfield' }) })
    );
  });

  it('exposes status and clears the cache', async () => {
    vi.mocked(transitRequest).mockResolvedValue({ stops: [stopB] });
    const service = new TransitService();
    await service.getNearbyStops(35.39, -119.02, 1000, 5);

    const status = service.getStatus();
    expect(status.configured).toBe(true);
    expect(status.provider).toBe('transit-api');
    expect(status.networks).toEqual(['GET|Bakersfield']);
    expect(status.cache.size).toBe(1);
    expect(status.rateLimit.used).toBe(1);
    expect(status.lastSuccessfulRequestAt).not.toBeNull();

    const cleared = service.clearCache();
    expect(cleared.size).toBe(0);
  });

  it('records the last error after an upstream failure', async () => {
    vi.mocked(transitRequest).mockRejectedValue(new TransitApiError('TRANSIT_RATE_LIMITED', 'too fast', 429, false));
    const service = new TransitService();
    await expect(service.getNearbyStops(35.39, -119.02, 1000, 5)).rejects.toMatchObject({ code: 'TRANSIT_RATE_LIMITED' });
    expect(service.getStatus().lastError?.code).toBe('TRANSIT_RATE_LIMITED');
  });
});
