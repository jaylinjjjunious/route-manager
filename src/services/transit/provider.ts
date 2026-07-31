import type {
  TransitTripRequest,
  TransitTrip,
  NearbyStopsRequest,
  NearbyStopsResult,
  StopArrivalsRequest,
  StopArrivalsResult,
  ServiceAlertsRequest,
  ServiceAlertsResult,
} from '../../types';

export interface TransitProvider {
  readonly name: string;
  planTrip(request: TransitTripRequest): Promise<TransitTrip>;
  getNearbyStops(request: NearbyStopsRequest): Promise<NearbyStopsResult>;
  getStopArrivals(request: StopArrivalsRequest): Promise<StopArrivalsResult>;
  getServiceAlerts(request?: ServiceAlertsRequest): Promise<ServiceAlertsResult>;
}
