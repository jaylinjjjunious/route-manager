/**
 * TTL cache with stale-while-revalidate support for Transit API responses.
 *
 * `get()` only returns entries that have not expired. `getStale()` returns an
 * entry even after it has expired so the service can fall back to the last
 * known data when the API is rate-limited or unavailable.
 */

interface CacheEntry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

export interface CacheStatus {
  size: number;
  capacity: number;
  oldestMs: number | null;
  newestMs: number | null;
}

export class TransitCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    // Expired entries are left in the store (not deleted) so `getStale()` can
    // still serve them while the API is rate-limited or offline. They are
    // overwritten on refresh and eventually evicted at capacity.
    if (Date.now() > entry.expiresAt) return null;
    return entry as CacheEntry<T>;
  }

  getStale<T>(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry as CacheEntry<T>;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const now = Date.now();
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      this.evictOldest();
    }
    this.store.set(key, { value, storedAt: now, expiresAt: now + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  get capacity(): number {
    return this.maxEntries;
  }

  getStatus(): CacheStatus {
    let oldestMs: number | null = null;
    let newestMs: number | null = null;
    for (const entry of this.store.values()) {
      oldestMs = oldestMs === null ? entry.storedAt : Math.min(oldestMs, entry.storedAt);
      newestMs = newestMs === null ? entry.storedAt : Math.max(newestMs, entry.storedAt);
    }
    return { size: this.store.size, capacity: this.maxEntries, oldestMs, newestMs };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, entry] of this.store.entries()) {
      if (entry.storedAt < oldestAt) {
        oldestAt = entry.storedAt;
        oldestKey = key;
      }
    }
    if (oldestKey !== null) this.store.delete(oldestKey);
  }
}
