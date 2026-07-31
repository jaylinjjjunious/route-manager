import { useCallback, useEffect, useRef, useState } from 'react';
import type { TransitStop, TransitFreshness, BusModeStatus } from '../types';
import { getTransitProvider } from '../services/transit/index';

export interface UseNearbyTransitStopsOptions {
  radiusMeters?: number;
  limit?: number;
}

export interface UseNearbyTransitStopsResult {
  stops: TransitStop[];
  status: BusModeStatus;
  error: string | null;
  freshness: TransitFreshness | null;
  lastUpdatedAt: Date | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches nearby stops for a coordinate. Re-fetches automatically when the
 * coordinate moves more than ~0.002 degrees (~220 m) so a walking worker does
 * not hammer the rate-limited API for a few meters of movement.
 */
export function useNearbyTransitStops(
  coords: { latitude: number; longitude: number } | null,
  options: UseNearbyTransitStopsOptions = {}
): UseNearbyTransitStopsResult {
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [status, setStatus] = useState<BusModeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<TransitFreshness | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const lastCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const fetchStops = useCallback(async (latitude: number, longitude: number) => {
    setStatus('loading');
    setError(null);
    try {
      const provider = getTransitProvider();
      const result = await provider.getNearbyStops({
        latitude,
        longitude,
        radiusMeters: options.radiusMeters ?? 1200,
        limit: options.limit ?? 10,
      });
      setStops(result.stops);
      setFreshness(result.freshness);
      setLastUpdatedAt(new Date());
      setStatus('active');
      lastCoordRef.current = { latitude, longitude };
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not load nearby stops.');
    }
  }, [options.radiusMeters, options.limit]);

  const refresh = useCallback(async () => {
    const target = lastCoordRef.current ?? coords;
    if (target) await fetchStops(target.latitude, target.longitude);
  }, [coords, fetchStops]);

  useEffect(() => {
    if (!coords) return;
    const prev = lastCoordRef.current;
    if (
      prev &&
      Math.abs(prev.latitude - coords.latitude) < 0.002 &&
      Math.abs(prev.longitude - coords.longitude) < 0.002
    ) {
      return;
    }
    void fetchStops(coords.latitude, coords.longitude);
  }, [coords?.latitude, coords?.longitude, fetchStops]);

  // Mark stale after 5 minutes without a refresh.
  useEffect(() => {
    if (status !== 'active' || !lastUpdatedAt) return;
    const timer = setTimeout(() => setStatus('stale'), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [status, lastUpdatedAt]);

  return { stops, status, error, freshness, lastUpdatedAt, refresh };
}
