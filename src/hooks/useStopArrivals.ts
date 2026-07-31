import { useCallback, useEffect, useState } from 'react';
import type { TransitStop, TransitArrival, TransitFreshness, BusModeStatus } from '../types';
import { getTransitProvider } from '../services/transit/index';

export interface UseStopArrivalsResult {
  stop: TransitStop | null;
  arrivals: TransitArrival[];
  status: BusModeStatus;
  error: string | null;
  freshness: TransitFreshness | null;
  lastUpdatedAt: Date | null;
  refresh: () => Promise<void>;
}

/** Live arrivals for a single stop. Re-fetches when the selected stop changes. */
export function useStopArrivals(stop: TransitStop | null): UseStopArrivalsResult {
  const [stopInfo, setStopInfo] = useState<TransitStop | null>(null);
  const [arrivals, setArrivals] = useState<TransitArrival[]>([]);
  const [status, setStatus] = useState<BusModeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<TransitFreshness | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchArrivals = useCallback(async (stopId: string) => {
    setStatus('loading');
    setError(null);
    try {
      const provider = getTransitProvider();
      const result = await provider.getStopArrivals({ stopId });
      setStopInfo(result.stop);
      setArrivals(result.arrivals);
      setFreshness(result.freshness);
      setLastUpdatedAt(new Date());
      setStatus('active');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not load arrivals.');
    }
  }, []);

  useEffect(() => {
    if (!stop) {
      setArrivals([]);
      setStopInfo(null);
      setStatus('idle');
      return;
    }
    void fetchArrivals(stop.stopId);
  }, [stop?.stopId, fetchArrivals]);

  const refresh = useCallback(async () => {
    if (stop) await fetchArrivals(stop.stopId);
  }, [stop, fetchArrivals]);

  // Mark stale after 60 seconds (arrivals move fast) but keep showing data.
  useEffect(() => {
    if (status !== 'active' || !lastUpdatedAt) return;
    const timer = setTimeout(() => setStatus('stale'), 60 * 1000);
    return () => clearTimeout(timer);
  }, [status, lastUpdatedAt]);

  return { stop: stopInfo, arrivals, status, error, freshness, lastUpdatedAt, refresh };
}
