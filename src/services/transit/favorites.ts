import type { FavoriteTransitStop, TransitStop } from '../../types';

/**
 * Favorite transit stops are persisted in localStorage under a versioned key.
 *
 * Note: favorites are device-local by design. There is no server-side account
 * store for them yet, so they do not sync across devices.
 */
export const FAVORITE_TRANSIT_STOPS_KEY = 'all_in_one_667_favorite_transit_stops_v1';

function isFavoriteStopRecord(value: unknown): value is FavoriteTransitStop {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.stopId === 'string' &&
    typeof record.stopName === 'string' &&
    typeof record.latitude === 'number' &&
    typeof record.longitude === 'number'
  );
}

export function loadFavoriteStops(): FavoriteTransitStop[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_TRANSIT_STOPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavoriteStopRecord);
  } catch {
    return [];
  }
}

function persist(list: FavoriteTransitStop[]): FavoriteTransitStop[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(FAVORITE_TRANSIT_STOPS_KEY, JSON.stringify(list));
    } catch {
      // Storage may be unavailable (private mode / quota); favorites just won't persist.
    }
  }
  return list;
}

export function addFavoriteStop(stop: TransitStop, customName?: string): FavoriteTransitStop[] {
  const current = loadFavoriteStops();
  const existing = current.find((f) => f.stopId === stop.stopId);
  if (existing) return current;

  const now = new Date().toISOString();
  const favorite: FavoriteTransitStop = {
    id: `fav-${stop.stopId}-${Date.now()}`,
    stopId: stop.stopId,
    stopName: stop.stopName,
    customName,
    latitude: stop.latitude,
    longitude: stop.longitude,
    createdAt: now,
    updatedAt: now,
  };
  return persist([favorite, ...current]);
}

export function removeFavoriteStop(stopId: string): FavoriteTransitStop[] {
  const current = loadFavoriteStops();
  return persist(current.filter((f) => f.stopId !== stopId));
}

export function renameFavoriteStop(stopId: string, customName: string): FavoriteTransitStop[] {
  const current = loadFavoriteStops();
  const trimmed = customName.trim();
  return persist(
    current.map((f) =>
      f.stopId === stopId
        ? { ...f, customName: trimmed.length > 0 ? trimmed : undefined, updatedAt: new Date().toISOString() }
        : f
    )
  );
}

export function isFavoriteStop(list: FavoriteTransitStop[], stopId: string): boolean {
  return list.some((f) => f.stopId === stopId);
}
