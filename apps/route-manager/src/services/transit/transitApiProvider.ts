import type {
  TransitTripRequest,
  TransitTrip,
  NearbyStopsRequest,
  NearbyStopsResult,
  StopArrivalsRequest,
  StopArrivalsResult,
  ServiceAlertsRequest,
  ServiceAlertsResult,
  TransitApiStatus,
} from '../../types';
import type { TransitProvider } from './provider';
import { transitGet, transitPost } from './transitApiClient';

/**
 * TransitProvider backed by the app's authenticated `/api/transit/*` proxy.
 * The real Transit API key is held server-side only.
 */

/** Aligned with the server clamp (`server/transit/transitService.ts`). */
export const MIN_NEARBY_RADIUS_METERS = 100;
export const MAX_NEARBY_RADIUS_METERS = 1500;
export const DEFAULT_NEARBY_RADIUS_METERS = 1000;

function clampRadius(radius?: number): number {
  const value = Number.isFinite(radius) ? Math.round(radius as number) : DEFAULT_NEARBY_RADIUS_METERS;
  return Math.min(MAX_NEARBY_RADIUS_METERS, Math.max(MIN_NEARBY_RADIUS_METERS, value));
}

export class TransitApiProvider implements TransitProvider {
  readonly name = 'transit-api';

  async planTrip(request: TransitTripRequest): Promise<TransitTrip> {
    const destination = request.destination;
    if (typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') {
      throw new Error('A destination location is required to plan a transit trip.');
    }

    const result = await transitPost<{ trip: TransitTrip; alternatives: number; freshness: TransitTrip['fetchedAt'] }>('/api/transit/trip-plan', {
      origin: { lat: request.origin.latitude, lng: request.origin.longitude },
      destination: { lat: destination.latitude, lng: destination.longitude },
      departureTime: request.departureTime,
      arrivalTime: request.arrivalTime,
    });

    const trip = result.trip;
    const anyCancelled = trip.legs.some((leg) => leg.type === 'transit' && leg.isCancelled);
    return {
      ...trip,
      onTimeStatus: anyCancelled ? 'late' : 'on-time',
      deadlineDifferenceMinutes: null,
    };
  }

  getNearbyStops(request: NearbyStopsRequest): Promise<NearbyStopsResult> {
    return transitGet<NearbyStopsResult>('/api/transit/nearby-stops', {
      lat: request.latitude,
      lon: request.longitude,
      radiusMeters: clampRadius(request.radiusMeters),
      limit: request.limit ?? 10,
    });
  }

  getStopArrivals(request: StopArrivalsRequest): Promise<StopArrivalsResult> {
    return transitGet<StopArrivalsResult>(`/api/transit/stops/${encodeURIComponent(request.stopId)}/arrivals`);
  }

  getServiceAlerts(request?: ServiceAlertsRequest): Promise<ServiceAlertsResult> {
    return transitGet<ServiceAlertsResult>('/api/transit/alerts', {
      lat: request?.latitude,
      lon: request?.longitude,
    });
  }

  getStatus(): Promise<TransitApiStatus> {
    return transitGet<TransitApiStatus>('/api/transit/status');
  }

  clearCache(): Promise<{ ok: boolean; size: number; capacity: number }> {
    return transitPost<{ ok: boolean; size: number; capacity: number }>('/api/transit/cache/clear', {});
  }
}
