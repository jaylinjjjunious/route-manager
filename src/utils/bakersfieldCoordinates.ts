import type { Coordinates } from '../types';

// Real latitude & longitude mapping for Bakersfield landmarks used by seed jobs,
// address resolution, routing, dispatcher, and transit planning.
export const BAKERSFIELD_COORDINATES: Record<string, Coordinates> = {
  "1951 Golden State Ave": { lat: 35.3904, lng: -119.0255 }, // Hub/Start
  "Family Dollar 2151 S Chester Ave": { lat: 35.3475, lng: -119.0142 },
  "Dollar General 5101 White Ln": { lat: 35.3308, lng: -119.0573 },
  "Vons 9000 Ming Ave": { lat: 35.3392, lng: -119.1005 },
  "Target 9100 Rosedale Hwy": { lat: 35.3813, lng: -119.1026 },
  "Albertsons 13045 Rosedale Hwy": { lat: 35.3855, lng: -119.1465 },
  "Family Dollar 600 Norris Rd": { lat: 35.4098, lng: -119.0198 },
  "BevMo 10650 Stockdale Hwy #500": { lat: 35.3512, lng: -119.1198 },
  "Tractor Supply / Buck Café Revisit: 2620 Buck Owens Blvd": { lat: 35.3821, lng: -119.0435 }
};

/**
 * Resolves an address into coordinates. If not found in the pre-mapped
 * Bakersfield dictionary, generate a deterministic nearby fallback coordinate.
 */
export function resolveCoordinates(address: string): Coordinates {
  const cleanAddress = address.trim();

  if (BAKERSFIELD_COORDINATES[cleanAddress]) {
    return BAKERSFIELD_COORDINATES[cleanAddress];
  }

  for (const [key, coords] of Object.entries(BAKERSFIELD_COORDINATES)) {
    if (cleanAddress.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanAddress.toLowerCase())) {
      return coords;
    }
  }

  const hash = cleanAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) / 1200;
  const lngOffset = (((hash * 17) % 100) - 50) / 1200;

  return {
    lat: 35.3904 + latOffset,
    lng: -119.0255 + lngOffset
  };
}
