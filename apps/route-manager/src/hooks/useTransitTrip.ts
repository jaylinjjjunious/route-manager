import { useState, useCallback, useRef, useEffect } from 'react';
import type { TransitTrip, BusModeStatus, Job } from '../types';
import { getTransitProvider } from '../services/transit/index';
import { deadlineComparison } from '../services/transit/leaveBy';

export interface UseTransitTripResult {
  trip: TransitTrip | null;
  status: BusModeStatus;
  error: string | null;
  fetchTrip: (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }, job?: Job) => Promise<void>;
  refreshTrip: () => Promise<void>;
  deadlineStatus: { arrivalMinutesBeforeDeadline: number | null; onTime: boolean | null; label: string } | null;
  lastFetchedAt: Date | null;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function useTransitTrip(
  origin: { latitude: number; longitude: number } | null,
  destination: { latitude: number; longitude: number } | null,
  job?: Job
): UseTransitTripResult {
  const [trip, setTrip] = useState<TransitTrip | null>(null);
  const [status, setStatus] = useState<BusModeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const lastRequestRef = useRef<{ origin: typeof origin; destination: typeof destination } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTripInternal = useCallback(async (
    orig: { latitude: number; longitude: number },
    dest: { latitude: number; longitude: number },
    jobArg?: Job
  ) => {
    setStatus('loading');
    setError(null);

    try {
      const provider = getTransitProvider();
      const result = await provider.planTrip({
        origin: orig,
        destination: dest,
        preferredMode: 'transit',
      });

      if (jobArg) {
        result.deadlineDifferenceMinutes = deadlineComparison(result, jobArg).arrivalMinutesBeforeDeadline;
      }

      setTrip(result);
      setLastFetchedAt(new Date());
      setStatus('active');
      lastRequestRef.current = { origin: orig, destination: dest };
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to fetch transit trip');
    }
  }, []);

  const fetchTrip = useCallback(async (
    orig: { latitude: number; longitude: number },
    dest: { latitude: number; longitude: number },
    jobArg?: Job
  ) => {
    await fetchTripInternal(orig, dest, jobArg);
  }, [fetchTripInternal]);

  const refreshTrip = useCallback(async () => {
    if (lastRequestRef.current?.origin && lastRequestRef.current?.destination) {
      await fetchTripInternal(lastRequestRef.current.origin, lastRequestRef.current.destination, job);
    }
  }, [fetchTripInternal, job]);

  // Auto-stale detection
  useEffect(() => {
    if (status !== 'active' || !lastFetchedAt) return;

    const checkStale = () => {
      const elapsed = Date.now() - lastFetchedAt.getTime();
      if (elapsed > STALE_THRESHOLD_MS) {
        setStatus('stale');
      }
    };

    timerRef.current = setTimeout(checkStale, STALE_THRESHOLD_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [status, lastFetchedAt]);

  const deadlineStatus = trip && job ? deadlineComparison(trip, job) : null;

  return { trip, status, error, fetchTrip, refreshTrip, deadlineStatus, lastFetchedAt };
}
