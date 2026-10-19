import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TransitCache } from '../server/transit/transitCache';

describe('TransitCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fresh entries and expires them after the TTL', () => {
    const cache = new TransitCache();
    cache.set('a', { hello: 'world' }, 1000);
    expect(cache.get('a')?.value).toEqual({ hello: 'world' });
    vi.advanceTimersByTime(1001);
    expect(cache.get('a')).toBeNull();
  });

  it('keeps expired entries readable via getStale for stale-while-revalidate', () => {
    const cache = new TransitCache();
    cache.set('a', 42, 1000);
    vi.advanceTimersByTime(2000);
    expect(cache.get('a')).toBeNull();
    expect(cache.getStale('a')?.value).toBe(42);
  });

  it('evicts the oldest entry at capacity', () => {
    const cache = new TransitCache(2);
    cache.set('old', 1, 10_000);
    cache.set('mid', 2, 10_000);
    cache.set('new', 3, 10_000);
    expect(cache.get('old')).toBeNull();
    expect(cache.get('mid')?.value).toBe(2);
    expect(cache.get('new')?.value).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('overwrites by key without evicting', () => {
    const cache = new TransitCache(1);
    cache.set('a', 1, 10_000);
    cache.set('a', 2, 10_000);
    expect(cache.get('a')?.value).toBe(2);
    expect(cache.size).toBe(1);
  });

  it('tracks size/capacity and clears', () => {
    const cache = new TransitCache(500);
    cache.set('a', 1, 10_000);
    cache.set('b', 2, 10_000);
    expect(cache.size).toBe(2);
    expect(cache.capacity).toBe(500);
    const status = cache.getStatus();
    expect(status.size).toBe(2);
    expect(status.capacity).toBe(500);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
