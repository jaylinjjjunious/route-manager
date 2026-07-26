import type { TransitTripRequest, TransitTrip } from '../../types';

export interface TransitProvider {
  readonly name: string;
  planTrip(request: TransitTripRequest): Promise<TransitTrip>;
}
