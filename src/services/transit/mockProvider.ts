import type {
  TransitTripRequest,
  TransitTrip,
  TransitLeg,
  NearbyStopsRequest,
  NearbyStopsResult,
  StopArrivalsRequest,
  StopArrivalsResult,
  ServiceAlertsRequest,
  ServiceAlertsResult,
  TransitStop,
  TransitArrival,
  TransitRoute,
  TransitAlert,
  TransitFreshness,
} from '../../types';
import type { TransitProvider } from './provider';

const MOCK_ROUTES: Array<{
  routeName: string;
  headsign: string;
  boardStop: string;
  exitStop: string;
  duration: number;
  waitMin: number;
  walkToMin: number;
  walkFromMin: number;
  transfers: number;
}> = [
  { routeName: 'GET 42', headsign: 'Downtown via Chester', boardStop: 'Chester Ave & Planz Rd', exitStop: 'Chester Ave & 4th St', duration: 28, waitMin: 12, walkToMin: 7, walkFromMin: 5, transfers: 0 },
  { routeName: 'GET 11', headsign: 'East Bakersfield', boardStop: 'Union Ave & Brundage Ln', exitStop: 'Union Ave & Niles St', duration: 22, waitMin: 8, walkToMin: 10, walkFromMin: 4, transfers: 0 },
  { routeName: 'GET 45', headsign: 'South Chester', boardStop: 'Chester Ave & 24th St', exitStop: 'Chester Ave & White Ln', duration: 18, waitMin: 15, walkToMin: 6, walkFromMin: 8, transfers: 0 },
  { routeName: 'GET 21 / 42', headsign: 'Downtown via Ming', boardStop: 'Ming Ave & Real Rd', exitStop: 'Chester Ave & 4th St', duration: 35, waitMin: 10, walkToMin: 9, walkFromMin: 5, transfers: 1 },
];

const MOCK_STOPS: Array<{ name: string; lat: number; lng: number; routes: string[]; distance: number }> = [
  { name: 'GET Offices', lat: 35.3919, lng: -119.0255, routes: ['42', '22'], distance: 163 },
  { name: 'Chester Ave & 36th St', lat: 35.3969, lng: -119.0156, routes: ['42', '45'], distance: 652 },
  { name: 'Ming Ave & Real Rd', lat: 35.3574, lng: -119.0363, routes: ['21', '42'], distance: 1450 },
  { name: 'Golden State Ave & Brundage Ln', lat: 35.3822, lng: -119.0242, routes: ['11'], distance: 980 },
  { name: 'Union Ave & Niles St', lat: 35.3768, lng: -118.9984, routes: ['11', '21'], distance: 2600 },
  { name: 'Chester Ave & 24th St', lat: 35.3701, lng: -119.0148, routes: ['45'], distance: 2250 },
];

function generateTime(minuteOffset: number): string {
  const d = new Date(Date.now() + minuteOffset * 60000);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function freshFreshness(now = Date.now()): TransitFreshness {
  return { source: 'live', lastUpdatedAt: new Date(now).toISOString(), ageMs: 0 };
}

function mockRoute(shortName: string, routeId: string): TransitRoute {
  return { routeId, shortName, longName: `GET Route ${shortName}` };
}

function mockArrival(shortName: string, routeId: string, headsign: string, minutesFromNow: number): TransitArrival {
  const now = Date.now();
  const departure = Math.round(now / 1000) + minutesFromNow * 60;
  return {
    tripId: `${routeId}-${departure}`,
    route: mockRoute(shortName, routeId),
    headsign,
    departureTime: departure,
    arrivalTime: departure + minutesFromNow * 30,
    scheduledDepartureTime: departure,
    scheduledArrivalTime: departure + minutesFromNow * 30,
    isRealTime: minutesFromNow % 3 === 0,
    isCancelled: false,
    isLast: false,
    wheelchairAccessible: 1,
  };
}

export class MockTransitProvider implements TransitProvider {
  readonly name = 'mock-transit';

  async planTrip(request: TransitTripRequest): Promise<TransitTrip> {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    const template = MOCK_ROUTES[Math.floor(Math.random() * MOCK_ROUTES.length)];
    const now = Date.now();
    const departMin = template.walkToMin + template.waitMin;
    const arriveMin = departMin + template.duration + template.walkFromMin;

    const legs: TransitLeg[] = [
      {
        type: 'walk',
        from: { latitude: request.origin.latitude, longitude: request.origin.longitude, name: 'Your location' },
        to: { latitude: request.origin.latitude + 0.002, longitude: request.origin.longitude + 0.001, name: template.boardStop },
        durationMinutes: template.walkToMin,
        distanceMeters: template.walkToMin * 80,
        coordinatesAvailable: true,
        instructions: [{ text: `Walk to ${template.boardStop}` }],
      },
      {
        type: 'transit',
        routeShortName: template.routeName.split(' ')[1],
        routeLongName: `GET Route ${template.routeName.split(' ')[1]}`,
        routeId: `GETCA:mock-${template.routeName.split(' ')[1]}`,
        headsign: template.headsign,
        agencyName: 'Golden Empire Transit',
        boardingStop: {
          stopId: `mock-${template.boardStop.replace(/\s/g, '-').toLowerCase()}`,
          stopName: template.boardStop,
          latitude: request.origin.latitude + 0.002,
          longitude: request.origin.longitude + 0.001,
        },
        exitStop: {
          stopId: `mock-${template.exitStop.replace(/\s/g, '-').toLowerCase()}`,
          stopName: template.exitStop,
          latitude: (request.destination.latitude || request.origin.latitude) + 0.001,
          longitude: (request.destination.longitude || request.origin.longitude) - 0.001,
        },
        departureTime: generateTime(departMin),
        arrivalTime: generateTime(departMin + template.duration),
        stopCount: Math.floor(template.duration / 3) + 1,
      },
    ];

    if (template.walkFromMin > 0) {
      legs.push({
        type: 'walk',
        from: { latitude: (request.destination.latitude || request.origin.latitude) + 0.001, longitude: (request.destination.longitude || request.origin.longitude) - 0.001, name: template.exitStop },
        to: { latitude: request.destination.latitude || request.origin.latitude, longitude: request.destination.longitude || request.origin.longitude, name: 'Job location' },
        durationMinutes: template.walkFromMin,
        distanceMeters: template.walkFromMin * 75,
        coordinatesAvailable: true,
        instructions: [{ text: `Walk to destination` }],
      });
    }

    return {
      tripId: `mock-trip-${Date.now()}`,
      origin: { latitude: request.origin.latitude, longitude: request.origin.longitude },
      destination: { latitude: request.destination.latitude || 0, longitude: request.destination.longitude || 0 },
      departureTime: generateTime(departMin),
      arrivalTime: generateTime(arriveMin),
      totalDurationMinutes: arriveMin,
      totalWalkingMinutes: template.walkToMin + template.walkFromMin,
      totalWalkingDistanceMeters: (template.walkToMin + template.walkFromMin) * 80,
      transferCount: template.transfers,
      onTimeStatus: 'on-time',
      deadlineDifferenceMinutes: null,
      legs,
      alerts: [],
      provider: this.name,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getNearbyStops(request: NearbyStopsRequest): Promise<NearbyStopsResult> {
    await new Promise(r => setTimeout(r, 150));
    const radius = request.radiusMeters ?? 1200;
    const stops: TransitStop[] = MOCK_STOPS
      .filter(s => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, request.limit ?? 10)
      .map(s => ({
        stopId: `mock-${s.name.replace(/\s/g, '-').toLowerCase()}`,
        stopName: s.name,
        latitude: s.lat,
        longitude: s.lng,
        coordinatesAvailable: true,
        distanceMeters: s.distance,
        routes: s.routes.map(r => mockRoute(r, `GETCA:mock-${r}`)),
      }));
    return { stops, freshness: freshFreshness() };
  }

  async getStopArrivals(request: StopArrivalsRequest): Promise<StopArrivalsResult> {
    await new Promise(r => setTimeout(r, 120));
    const known = MOCK_STOPS.find(s => `mock-${s.name.replace(/\s/g, '-').toLowerCase()}` === request.stopId);
    const stop: TransitStop | null = known
      ? { stopId: request.stopId, stopName: known.name, latitude: known.lat, longitude: known.lng, routes: known.routes.map(r => mockRoute(r, `GETCA:mock-${r}`)) }
      : null;
    const arrivals: TransitArrival[] = [];
    (known ? known.routes : ['22', '42']).forEach((routeShort, index) => {
      arrivals.push(mockArrival(routeShort, `GETCA:mock-${routeShort}`, index % 2 === 0 ? 'Downtown via Chester' : 'CSUB', 4 + index * 9));
      arrivals.push(mockArrival(routeShort, `GETCA:mock-${routeShort}`, index % 2 === 0 ? 'Downtown via Chester' : 'CSUB', 28 + index * 17));
    });
    arrivals.sort((a, b) => a.departureTime - b.departureTime);
    return { stop, arrivals, freshness: freshFreshness() };
  }

  async getServiceAlerts(_request?: ServiceAlertsRequest): Promise<ServiceAlertsResult> {
    await new Promise(r => setTimeout(r, 100));
    const alerts: TransitAlert[] = [
      {
        id: 'mock-alert-1',
        title: '41 Valley Plaza / Bakersfield - Mt Vernon/Niles detour',
        description: 'Due to construction stop from Mt Vernon to College will be out of service.',
        severity: 'critical',
        cause: 'CONSTRUCTION',
        effect: 'NO_SERVICE',
      },
      {
        id: 'mock-alert-2',
        title: 'Trolley detour during construction',
        description: 'Trolley will operate on 17th Street between Q Street and Chester.',
        severity: 'warning',
        cause: 'CONSTRUCTION',
        effect: 'STOP_MOVED',
      },
    ];
    return { alerts, freshness: freshFreshness() };
  }
}
