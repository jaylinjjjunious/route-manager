import { useCallback, useEffect, useState } from 'react';
import type { TransitAlert, TransitFreshness, BusModeStatus } from '../types';
import { getTransitProvider } from '../services/transit/index';

export interface UseTransitAlertsResult {
  alerts: TransitAlert[];
  status: BusModeStatus;
  error: string | null;
  freshness: TransitFreshness | null;
  refresh: () => Promise<void>;
}

/** Active service alerts for the local transit network(s). */
export function useTransitAlerts(location?: { latitude: number; longitude: number } | null): UseTransitAlertsResult {
  const [alerts, setAlerts] = useState<TransitAlert[]>([]);
  const [status, setStatus] = useState<BusModeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<TransitFreshness | null>(null);

  const fetchAlerts = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const provider = getTransitProvider();
      const result = await provider.getServiceAlerts(
        location ? { latitude: location.latitude, longitude: location.longitude } : undefined
      );
      setAlerts(result.alerts);
      setFreshness(result.freshness);
      setStatus('active');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not load service alerts.');
    }
  }, [location?.latitude, location?.longitude]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const refresh = useCallback(async () => {
    await fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, status, error, freshness, refresh };
}
