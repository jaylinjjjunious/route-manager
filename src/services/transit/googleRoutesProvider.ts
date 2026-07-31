import type { TransitTripRequest, TransitTrip, TransitLeg, TransitWalkLeg, TransitRideLeg, TransitStop, TransitPoint, NearbyStopsRequest, NearbyStopsResult, StopArrivalsRequest, StopArrivalsResult, ServiceAlertsRequest, ServiceAlertsResult } from '../../types';
import type { TransitProvider } from './provider';
import { authFetch } from '../apiClient';

function parseDuration(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/(\d+)s/);
  return m ? Math.ceil(parseInt(m[1], 10) / 60) : 0;
}

function parseTimestamp(ts: string | undefined): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function mapWalkLeg(step: any, from: TransitPoint, to: TransitPoint): TransitWalkLeg {
  return {
    type: 'walk',
    from,
    to,
    durationMinutes: parseDuration(step.duration),
    distanceMeters: step.distanceMeters || 0,
    coordinatesAvailable: true,
    instructions: step.localizedValues
      ? [{ text: step.localizedValues.instructions || 'Walk' }]
      : [{ text: 'Walk' }],
    polyline: step.polyline?.encodedPolyline,
  };
}

function mapTransitLeg(step: any, from: TransitPoint, to: TransitPoint): TransitRideLeg {
  const transit = step.transitDetails;
  const stop = transit?.stopDetails;
  return {
    type: 'transit',
    routeShortName: transit?.transitLine?.nameShort || transit?.transitLine?.name,
    routeLongName: transit?.transitLine?.name,
    headsign: transit?.headsign,
    agencyName: transit?.transitLine?.agencies?.[0]?.name,
    boardingStop: {
      stopId: stop?.departureStop?.stopId || '',
      stopName: stop?.departureStop?.name || 'Boarding Stop',
      latitude: stop?.departureStop?.location?.latitude || from.latitude,
      longitude: stop?.departureStop?.location?.longitude || from.longitude,
    },
    exitStop: {
      stopId: stop?.arrivalStop?.stopId || '',
      stopName: stop?.arrivalStop?.name || 'Exit Stop',
      latitude: stop?.arrivalStop?.location?.latitude || to.latitude,
      longitude: stop?.arrivalStop?.location?.longitude || to.longitude,
    },
    departureTime: parseTimestamp(transit?.departureTime),
    predictedDepartureTime: transit?.predictedDepartureTime
      ? parseTimestamp(transit.predictedDepartureTime)
      : undefined,
    arrivalTime: parseTimestamp(transit?.arrivalTime),
    predictedArrivalTime: transit?.predictedArrivalTime
      ? parseTimestamp(transit.predictedArrivalTime)
      : undefined,
    stopCount: transit?.stopCount,
  };
}

export class GoogleRoutesTransitProvider implements TransitProvider {
  readonly name = 'google-routes';

  async planTrip(request: TransitTripRequest): Promise<TransitTrip> {
    const response = await authFetch('/api/transit/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: request.origin,
        destination: request.destination,
        departureTime: request.departureTime || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Transit route request failed (${response.status})`);
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) throw new Error('No transit route found');

    const legs: TransitLeg[] = [];
    let totalWalkingMinutes = 0;
    let totalWalkingDistanceMeters = 0;
    let transferCount = 0;
    const boardingStops: TransitStop[] = [];

    for (const step of route.legs?.[0]?.steps || []) {
      const fromPt: TransitPoint = {
        latitude: step.startLocation?.latitude || request.origin.latitude,
        longitude: step.startLocation?.longitude || request.origin.longitude,
      };
      const toPt: TransitPoint = {
        latitude: step.endLocation?.latitude || request.origin.latitude,
        longitude: step.endLocation?.longitude || request.origin.longitude,
      };

      if (step.travelMode === 'WALK') {
        const walk = mapWalkLeg(step, fromPt, toPt);
        legs.push(walk);
        totalWalkingMinutes += walk.durationMinutes;
        totalWalkingDistanceMeters += walk.distanceMeters;
      } else if (step.travelMode === 'TRANSIT') {
        const ride = mapTransitLeg(step, fromPt, toPt);
        legs.push(ride);
        boardingStops.push(ride.boardingStop);
      }
    }

    transferCount = Math.max(0, boardingStops.length - 1);

    const totalDurationMinutes = parseDuration(route.duration);
    const departureTime = parseTimestamp(route.legs?.[0]?.departureTime);
    const arrivalTime = parseTimestamp(route.legs?.[0]?.arrivalTime);

    return {
      tripId: `trip-${Date.now()}`,
      origin: request.origin,
      destination: request.destination as TransitPoint,
      departureTime,
      arrivalTime,
      totalDurationMinutes,
      totalWalkingMinutes,
      totalWalkingDistanceMeters,
      transferCount,
      onTimeStatus: 'unknown',
      deadlineDifferenceMinutes: null,
      legs,
      alerts: [],
      provider: this.name,
      fetchedAt: new Date().toISOString(),
    };
  }

  getNearbyStops(_request: NearbyStopsRequest): Promise<NearbyStopsResult> {
    throw new Error('Nearby stops are not available with the Google Routes provider.');
  }

  getStopArrivals(_request: StopArrivalsRequest): Promise<StopArrivalsResult> {
    throw new Error('Live arrivals are not available with the Google Routes provider.');
  }

  getServiceAlerts(_request?: ServiceAlertsRequest): Promise<ServiceAlertsResult> {
    throw new Error('Service alerts are not available with the Google Routes provider.');
  }
}
