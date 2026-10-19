import type { TransitTrip } from '../../types';

export function buildGoogleMapsTransitUrl(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=transit`;
}

export function buildAppleMapsTransitUrl(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): string {
  return `https://maps.apple.com/?sll=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}&dirflg=r`;
}

export function buildWalkingMapsUrl(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=walking`;
}

export function getTransitMapsUrls(trip: TransitTrip): {
  full: string;
  google: string;
  apple: string;
} {
  const origin = { lat: trip.origin.latitude, lng: trip.origin.longitude };
  const destination = { lat: trip.destination.latitude || 0, lng: trip.destination.longitude || 0 };

  return {
    full: buildGoogleMapsTransitUrl(origin, destination),
    google: buildGoogleMapsTransitUrl(origin, destination),
    apple: buildAppleMapsTransitUrl(origin, destination),
  };
}
