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
      radiusMeters: request.radiusMeters ?? 1200,
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
