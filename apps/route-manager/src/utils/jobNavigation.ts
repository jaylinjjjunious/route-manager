import type { Coordinates, Job, TravelMode } from '../types';

type JobLocation = Pick<Job, 'address' | 'coordinates'>;
type MapsLocation = Coordinates | JobLocation | string;

function mapsLocation(location: MapsLocation): string {
  if (typeof location === 'string') return location;
  if ('address' in location) {
    return location.address.trim() || `${location.coordinates.lat},${location.coordinates.lng}`;
  }
  return `${location.lat},${location.lng}`;
}

export function buildJobMapsUrl(job: JobLocation, origin: MapsLocation | undefined, mode: TravelMode): string {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (origin) url.searchParams.set('origin', mapsLocation(origin));
  url.searchParams.set('destination', mapsLocation(job));
  url.searchParams.set('travelmode', mode);
  return url.toString();
}
