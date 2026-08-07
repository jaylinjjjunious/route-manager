/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import safeStorage from '../../utils/safeStorage';
import type { EbikeConfig } from '../../types';
import type { RideTrackerSession, RideSummary, UseRideTrackerReturn, FinishTrackerDayParams } from './types';

export function useRideTracker(
  ebikeConfig: EbikeConfig,
  learnedBatteryPercentPerMile: number,
  batteryFactor: number
): UseRideTrackerReturn {
  // ── Core tracker state ────────────────────────────────────────────
  const [status, setStatus] = useState<'idle' | 'riding' | 'at_store' | 'completed'>(() => {
    return (safeStorage.getItem('ride_tracker_status') as any) || 'idle';
  });

  const [rideTime, setRideTime] = useState<number>(() => {
    return Number(safeStorage.getItem('ride_tracker_ride_time') || '0');
  });

  const [storeTime, setStoreTime] = useState<number>(() => {
    return Number(safeStorage.getItem('ride_tracker_store_time') || '0');
  });

  const [totalDayTime, setTotalDayTime] = useState<number>(() => {
    return Number(safeStorage.getItem('ride_tracker_total_day_time') || '0');
  });

  const [startBattery, setStartBattery] = useState<number>(() => {
    return Number(safeStorage.getItem('ride_tracker_start_battery') || '100');
  });

  const [jobsCompleted, setJobsCompleted] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem('ride_tracker_jobs_completed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [rideModeActive, setRideModeActive] = useState(false);
  const [rideStartedAt, setRideStartedAt] = useState<string | null>(null);
  const [rideSummary, setRideSummary] = useState<RideSummary | null>(null);

  const [sessions, setSessions] = useState<RideTrackerSession[]>(() => {
    try {
      const saved = safeStorage.getItem('ride_tracker_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const timerRef = useRef<number | null>(null);

  // ── Persistence of active tracking variables ──────────────────────
  useEffect(() => {
    safeStorage.setItem('ride_tracker_status', status);
    safeStorage.setItem('ride_tracker_ride_time', rideTime.toString());
    safeStorage.setItem('ride_tracker_store_time', storeTime.toString());
    safeStorage.setItem('ride_tracker_total_day_time', totalDayTime.toString());
    safeStorage.setItem('ride_tracker_start_battery', startBattery.toString());
    safeStorage.setItem('ride_tracker_jobs_completed', JSON.stringify(jobsCompleted));
  }, [status, rideTime, storeTime, totalDayTime, startBattery, jobsCompleted]);

  // ── 1-second timer interval ───────────────────────────────────────
  useEffect(() => {
    if (status === 'riding' || status === 'at_store') {
      timerRef.current = window.setInterval(() => {
        setTotalDayTime((prev) => prev + 1);
        if (status === 'riding') {
          setRideTime((prev) => prev + 1);
        } else if (status === 'at_store') {
          setStoreTime((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // ── Derived tracker values ────────────────────────────────────────
  const isWorkSessionActive = useMemo(
    () => status === 'riding' || status === 'at_store',
    [status]
  );

  const rideDistance = useMemo(() => {
    return parseFloat(((rideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(1));
  }, [rideTime, ebikeConfig.avgSpeedMph]);

  const rideBatteryUsed = useMemo(() => {
    return parseFloat(
      (rideDistance * learnedBatteryPercentPerMile * batteryFactor).toFixed(1)
    );
  }, [rideDistance, learnedBatteryPercentPerMile, batteryFactor]);

  const rideAverageSpeed = useMemo(() => {
    return rideTime > 0
      ? (rideDistance / (rideTime / 3600)).toFixed(1)
      : '0.0';
  }, [rideTime, rideDistance]);

  const formatRideEarningsPerHour = useCallback(
    (earned: number) => {
      return totalDayTime > 0
        ? (earned / (totalDayTime / 3600)).toFixed(2)
        : '0.00';
    },
    [totalDayTime]
  );

  // ── Feature-owned actions ─────────────────────────────────────────
  const startSession = useCallback((startBatteryValue: number) => {
    setStatus('riding');
    setStartBattery(startBatteryValue);
    setRideTime(0);
    setStoreTime(0);
    setTotalDayTime(0);
    setJobsCompleted([]);
  }, []);

  const setRiding = useCallback(() => {
    setStatus('riding');
  }, []);

  const setAtStore = useCallback(() => {
    setStatus('at_store');
  }, []);

  const setCompleted = useCallback(() => {
    setStatus('completed');
  }, []);

  const resetSession = useCallback(() => {
    setStatus('idle');
    setRideTime(0);
    setStoreTime(0);
    setTotalDayTime(0);
    setJobsCompleted([]);
  }, []);

  const toggleJobInSession = useCallback((jobId: string) => {
    setJobsCompleted((prev) => {
      if (prev.includes(jobId)) {
        return prev.filter((id) => id !== jobId);
      }
      return [...prev, jobId];
    });
  }, []);

  const trackJobCompletion = useCallback(
    (jobId: string, estimatedMinutes: number) => {
      setJobsCompleted((prev) =>
        prev.includes(jobId) ? prev : [...prev, jobId]
      );
      setStoreTime((prev) => prev + estimatedMinutes * 60);
    },
    []
  );

  const clearHistory = useCallback(() => {
    setSessions([]);
    safeStorage.removeItem('ride_tracker_sessions');
  }, []);

  const enterRideMode = useCallback(
    (startedAt: string, startBatteryValue: number) => {
      setRideSummary(null);
      setRideModeActive(true);
      setRideStartedAt(startedAt);
      setStatus('riding');
      setRideTime(0);
      setStoreTime(0);
      setTotalDayTime(0);
      setStartBattery(startBatteryValue);
      setJobsCompleted([]);
    },
    []
  );

  const exitRideMode = useCallback(() => {
    setRideModeActive(false);
    setStatus('idle');
  }, []);

  const addSession = useCallback((session: RideTrackerSession) => {
    setSessions((prev) => {
      const updated = [session, ...prev];
      safeStorage.setItem('ride_tracker_sessions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const finishTrackerDay = useCallback(
    ({ endBattery, completedJobNames, estimatedEarnings }: FinishTrackerDayParams) => {
      if (status === 'idle') {
        throw new Error('Cannot finish tracker day while idle');
      }

      const batteryUsed = Math.max(0, startBattery - endBattery);
      const distance = parseFloat(
        ((rideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(1)
      );
      const estimatedFullRange =
        batteryUsed > 0
          ? parseFloat(((distance / batteryUsed) * 100).toFixed(1))
          : null;

      const newSession: RideTrackerSession = {
        id: `session-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        startedAt: rideStartedAt,
        endedAt: new Date().toISOString(),
        rideTime,
        storeTime,
        totalDayTime,
        startBattery,
        endBattery,
        batteryUsed,
        jobsCompletedCount: jobsCompleted.length,
        completedJobNames,
        distance,
        estimatedEarnings,
        earningsPerHour:
          totalDayTime > 0
            ? parseFloat((estimatedEarnings / (totalDayTime / 3600)).toFixed(2))
            : 0,
        avgRideSpeed:
          rideTime > 0
            ? parseFloat((distance / (rideTime / 3600)).toFixed(1))
            : 0,
        learnedRange: estimatedFullRange,
      };

      setSessions((prev) => {
        const updated = [newSession, ...prev];
        safeStorage.setItem('ride_tracker_sessions', JSON.stringify(updated));
        return updated;
      });

      setStatus('completed');
      return newSession;
    },
    [status, startBattery, rideTime, storeTime, totalDayTime, rideStartedAt, jobsCompleted, ebikeConfig.avgSpeedMph]
  );

  return {
    status,
    rideTime,
    storeTime,
    totalDayTime,
    startBattery,
    jobsCompleted,
    rideModeActive,
    rideStartedAt,
    rideSummary,
    sessions,

    isWorkSessionActive,
    rideDistance,
    rideBatteryUsed,
    rideAverageSpeed,
    formatRideEarningsPerHour,

    startSession,
    setRiding,
    setAtStore,
    setCompleted,
    resetSession,
    toggleJobInSession,
    trackJobCompletion,
    clearHistory,
    enterRideMode,
    exitRideMode,
    setRideSummary,
    addSession,
    finishTrackerDay,
  };
}
