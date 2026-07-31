import { describe, expect, it, beforeEach } from 'vitest';
import {
  addFavoriteStop,
  isFavoriteStop,
  loadFavoriteStops,
  removeFavoriteStop,
  renameFavoriteStop,
  FAVORITE_TRANSIT_STOPS_KEY,
} from '../src/services/transit/favorites';
import type { TransitStop } from '../src/types';

function makeStop(overrides: Partial<TransitStop> = {}): TransitStop {
  return {
    stopId: 'GETCA:5391',
    stopName: 'Chester / 36th',
    latitude: 35.3969,
    longitude: -119.0156,
    ...overrides,
  };
}

describe('favorite transit stops', () => {
  beforeEach(() => localStorage.clear());

  it('adds, lists, and re-reads favorites from localStorage', () => {
    let list = addFavoriteStop(makeStop());
    expect(list).toHaveLength(1);
    expect(isFavoriteStop(list, 'GETCA:5391')).toBe(true);
    expect(loadFavoriteStops()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(FAVORITE_TRANSIT_STOPS_KEY) || '[]')).toHaveLength(1);
  });

  it('does not duplicate an existing stopId', () => {
    addFavoriteStop(makeStop());
    const list = addFavoriteStop(makeStop());
    expect(list).toHaveLength(1);
  });

  it('removes a favorite', () => {
    addFavoriteStop(makeStop());
    const list = removeFavoriteStop('GETCA:5391');
    expect(list).toHaveLength(0);
    expect(isFavoriteStop(list, 'GETCA:5391')).toBe(false);
  });

  it('renames a favorite, and clears a custom name when blank', () => {
    addFavoriteStop(makeStop());
    let list = renameFavoriteStop('GETCA:5391', 'Home Depot Stop');
    expect(list[0].customName).toBe('Home Depot Stop');

    list = renameFavoriteStop('GETCA:5391', '   ');
    expect(list[0].customName).toBeUndefined();
  });

  it('is tolerant of corrupt localStorage data', () => {
    localStorage.setItem(FAVORITE_TRANSIT_STOPS_KEY, 'not-json{');
    expect(loadFavoriteStops()).toEqual([]);
    localStorage.setItem(
      FAVORITE_TRANSIT_STOPS_KEY,
      JSON.stringify([
        { nonsense: true },
        { id: 'fav-1', stopId: 'GETCA:5391', stopName: 'Chester / 36th', latitude: 35.3969, longitude: -119.0156 },
      ])
    );
    const list = loadFavoriteStops();
    expect(list).toHaveLength(1);
    expect(list[0].stopId).toBe('GETCA:5391');
  });
});
