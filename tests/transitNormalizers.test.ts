import { describe, expect, it } from 'vitest';
import {
  normalizeArrivals,
  normalizeAlert,
  normalizeAlerts,
  normalizePlan,
} from '../server/transit/transitService';
import type {
  UpstreamAlert,
  UpstreamNearbyStop,
  UpstreamPlanResult,
  UpstreamStopDeparturesResponse,
} from '../server/transit/transitTypes';

const stopA: UpstreamNearbyStop = {
  global_stop_id: 'GETCA:5391',
  stop_name: 'Chester / 36th',
  stop_lat: 35.3969,
  stop_lon: -119.0156,
  distance: 652,
  stop_code: '5391',
  route_type: 3,
  wheelchair_boarding: 1,
  city_name: 'Bakersfield',
};

const stopB: UpstreamNearbyStop = {
  global_stop_id: 'GETCA:5113',
  stop_name: 'GET Offices',
  stop_lat: 35.3919,
  stop_lon: -119.0255,
  distance: 163,
  stop_code: '5113',
  route_type: 3,
};

describe('transit normalizers', () => {
  describe('normalizeArrivals', () => {
    it('flattens merged itineraries and sorts by departure time', () => {
      const raw: UpstreamStopDeparturesResponse = {
        route_departures: [
          {
            global_route_id: 'GETCA:118303',
            compact_display_short_name: { boxed_text: '22', elements: [null, '22', null] },
            merged_itineraries: [
              {
                merged_headsign: 'Downtown Bakersfield',
                schedule_items: [
                  {
                    departure_time: 1_700_000_200,
                    arrival_time: 1_700_000_900,
                    scheduled_departure_time: 1_700_000_200,
                    is_real_time: true,
                    is_cancelled: false,
                    is_last: false,
                    rt_trip_id: 'trip-live',
                    wheelchair_accessible: 1,
                  },
                  {
                    departure_time: 1_700_000_100,
                    arrival_time: 1_700_000_800,
                    scheduled_departure_time: 1_700_000_100,
                    is_real_time: false,
                    is_cancelled: false,
                    is_last: true,
                    rt_trip_id: 'trip-scheduled',
                  },
                ],
              },
            ],
          },
        ],
      };

      const arrivals = normalizeArrivals(raw);
      expect(arrivals).toHaveLength(2);
      expect(arrivals[0].tripId).toBe('trip-scheduled');
      expect(arrivals[0].departureTime).toBe(1_700_000_100);
      expect(arrivals[1].tripId).toBe('trip-live');
      expect(arrivals[1].route.shortName).toBe('22');
      expect(arrivals[1].route.routeId).toBe('GETCA:118303');
      expect(arrivals[1].headsign).toBe('Downtown Bakersfield');
      expect(arrivals[1].isRealTime).toBe(true);
      expect(arrivals[1].wheelchairAccessible).toBe(1);
      expect(arrivals[1].scheduledDepartureTime).toBe(1_700_000_200);
    });

    it('skips schedule items without a departure time', () => {
      const raw: UpstreamStopDeparturesResponse = {
        route_departures: [
          {
            global_route_id: 'GETCA:1',
            merged_itineraries: [{ schedule_items: [{ arrival_time: 123 }] }],
          },
        ],
      };
      expect(normalizeArrivals(raw)).toEqual([]);
    });
  });

  describe('normalizeAlert', () => {
    it('maps severity, periods, and affected entities', () => {
      const raw: UpstreamAlert = {
        created_at: 1_700_000_000,
        title: '41 Valley Plaza / Bakersfield - Mt Vernon/Niles detour',
        description: 'Buses rerouted',
        severity: 'Severe',
        cause: 'CONSTRUCTION',
        effect: 'NO_SERVICE',
        active_periods: [{ start: 1_700_000_000, end: null }],
        informed_entities: [{ global_route_id: 'GETCA:118303' }, { global_stop_id: 'GETCA:5047' }],
      };
      const alert = normalizeAlert(raw);
      expect(alert.severity).toBe('critical');
      expect(alert.cause).toBe('CONSTRUCTION');
      expect(alert.effect).toBe('NO_SERVICE');
      expect(alert.activeFrom).toBe(1_700_000_000);
      expect(alert.activeUntil).toBeNull();
      expect(alert.affectedRoutes).toEqual(['GETCA:118303']);
      expect(alert.affectedStops).toEqual(['GETCA:5047']);
    });

    it('ranks critical alerts first', () => {
      const alerts = normalizeAlerts([
        { title: 'info one', severity: 'Info', created_at: 1 },
        { title: 'severe one', severity: 'Severe', created_at: 2 },
        { title: 'warn one', severity: 'Warning', created_at: 3 },
      ]);
      expect(alerts.map((a) => a.severity)).toEqual(['critical', 'warning', 'info']);
    });
  });

  describe('normalizePlan', () => {
    const baseLeg = (overrides: Partial<Record<string, unknown>>) => ({
      leg_mode: 'walk',
      duration: 600,
      distance: 800,
      polyline: 'abc',
      ...overrides,
    });

    it('builds a trip with walk + transit legs, totals, transfer count, and fare', () => {
      const raw: UpstreamPlanResult = {
        duration: 2443,
        start_time: 1_700_000_000,
        end_time: 1_700_002_443,
        fare: { price: 1.75, currency: 'USD' },
        legs: [
          baseLeg({}),
          {
            leg_mode: 'transit',
            duration: 1500,
            departures: [
              { departure_time: 1_700_000_600, arrival_time: 1_700_001_500, is_cancelled: false, is_real_time: true },
            ],
            routes: [
              {
                global_route_id: 'GETCA:118303',
                compact_display_short_name: { boxed_text: '22', elements: [null, '22', null] },
                stops: [stopA, stopB],
                itineraries: [{ merged_headsign: 'Downtown' }],
                alerts: [{ title: 'detour', severity: 'Severe', created_at: 9 }],
              },
            ],
          },
        ],
      };

      const trip = normalizePlan(raw, { lat: 35.4, lng: -119.02 }, { lat: 35.38, lng: -118.99 }, '2026-07-30T00:00:00.000Z');
      expect(trip).not.toBeNull();
      expect(trip!.totalDurationMinutes).toBe(41);
      expect(trip!.totalWalkingMinutes).toBe(10);
      expect(trip!.totalWalkingDistanceMeters).toBe(800);
      expect(trip!.transferCount).toBe(0);
      expect(trip!.fare).toBe('1.75 USD');
      expect(trip!.provider).toBe('transit-api');
      expect(trip!.legs).toHaveLength(2);
      const ride = trip!.legs[1];
      expect(ride.type).toBe('transit');
      if (ride.type === 'transit') {
        expect(ride.routeId).toBe('GETCA:118303');
        expect(ride.routeShortName).toBe('22');
        expect(ride.headsign).toBe('Downtown');
        expect(ride.boardingStop.stopId).toBe('GETCA:5391');
        expect(ride.exitStop.stopId).toBe('GETCA:5113');
        const expectedClock = new Date(1_700_000_600 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        expect(ride.departureTime).toBe(expectedClock);
        expect(ride.isCancelled).toBe(false);
        expect(ride.stopCount).toBe(2);
      }
      expect(trip!.alerts).toHaveLength(1);
      expect(trip!.alerts[0].severity).toBe('critical');
    });

    it('counts transfers across multiple transit legs', () => {
      const raw: UpstreamPlanResult = {
        duration: 2000,
        start_time: 100,
        end_time: 2100,
        legs: [
          baseLeg({ leg_mode: 'transit', duration: 900 }),
          baseLeg({ leg_mode: 'transit', duration: 900 }),
        ],
      };
      const trip = normalizePlan(raw, { lat: 0, lng: 0 }, { lat: 0, lng: 0 }, 'fetched');
      expect(trip!.transferCount).toBe(1);
      expect(trip!.legs.filter((l) => l.type === 'transit')).toHaveLength(2);
    });

    it('returns null when essential timing fields are missing', () => {
      expect(normalizePlan({ duration: 100 } as UpstreamPlanResult, { lat: 0, lng: 0 }, { lat: 0, lng: 0 }, 'fetched')).toBeNull();
    });
  });
});
