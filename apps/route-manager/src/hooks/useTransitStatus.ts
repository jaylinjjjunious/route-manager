import { useCallback, useEffect, useState } from 'react';
import type { TransitApiStatus } from '../types';
import { isTransitApiEnabled, getTransitStatusProvider } from '../services/transit/index';

export interface UseTransitStatusResult {
  status: TransitApiStatus | null;
  supported: boolean;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/** Server-side Transit API status for the Settings diagnostic section. */
export function useTransitStatus(): UseTransitStatusResult {
  const [status, setStatus] = useState<TransitApiStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const provider = getTransitStatusProvider();
    if (!provider) {
      setStatus(null);
      setLoaded(true);
      return;
    }
    setError(null);
    try {
      const next = await provider.getStatus();
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the Transit status endpoint.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearCache = useCallback(async () => {
    const provider = getTransitStatusProvider();
    if (!provider) return;
    try {
      await provider.clearCache();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear the Transit cache.');
    }
  }, [refresh]);

  return { status, supported: isTransitApiEnabled(), loaded, error, refresh, clearCache };
}
