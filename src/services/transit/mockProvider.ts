import type { TransitTripRequest, TransitTrip, TransitLeg } from '../../types';
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

function generateTime(minuteOffset: number): string {
  const d = new Date(Date.now() + minuteOffset * 60000);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
        instructions: [{ text: `Walk to ${template.boardStop}` }],
      },
      {
        type: 'transit',
        routeShortName: template.routeName.split(' ')[1],
        routeLongName: `GET Route ${template.routeName.split(' ')[1]}`,
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
}
