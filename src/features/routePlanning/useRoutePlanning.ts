/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import type { Coordinates, EbikeConfig, Job, RouteMetrics, TravelMode } from '../../types';
import { isJobCompleted, isRevisionJob } from '../jobs/jobState';
import { getDistanceInMiles } from '../../utils/geoUtils';
import { calculateRouteMetrics, detectOutliers } from './routeUtils';
import type { RouteOptimizationLog } from './types';

interface UseRoutePlanningArgs {
  allJobs: Job[];
  routeAJobs: Job[];
  todayRouteJobs: Job[];
  executableRouteJobs: Job[];
  startAddress: string;
  startCoord: Coordinates;
  ebikeConfig: EbikeConfig;
  currentBattery: number;
  batteryFactor: number;
  rideDistance: number;
  travelMode: TravelMode;
}

export function useRoutePlanning({
  allJobs,
  routeAJobs,
  todayRouteJobs,
  executableRouteJobs,
  startAddress,
  startCoord,
  ebikeConfig,
  currentBattery,
  batteryFactor,
  rideDistance,
  travelMode,
}: UseRoutePlanningArgs) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedDistance, setSimulatedDistance] = useState(0);
  const [simulatedBattery, setSimulatedBattery] = useState(100);
  const [simulationStatus, setSimulationStatus] = useState<string>('');
  const [simulatedJobsCompleted, setSimulatedJobsCompleted] = useState<string[]>([]);
  const [lastOptimizationLog, setLastOptimizationLog] = useState<RouteOptimizationLog | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const simTimerRef = useRef<number | null>(null);
  const prevJobsRef = useRef<Job[]>([]);
  const prevMetricsRef = useRef<RouteMetrics | null>(null);

  const baseStandardMetrics = calculateRouteMetrics(startCoord, routeAJobs, ebikeConfig);
  const standardMetrics = {
    ...baseStandardMetrics,
    estimatedBatteryUsage: parseFloat((baseStandardMetrics.estimatedBatteryUsage * batteryFactor).toFixed(1)),
  };
  const activeMetrics = standardMetrics;

  const outliersReport = detectOutliers(startCoord, routeAJobs, ebikeConfig);
  const outlierIds = outliersReport.map((report) => report.jobId);
  const projectedBatteryAfterRoute = Math.max(0, Math.round(currentBattery - activeMetrics.estimatedBatteryUsage));
  const usableRangeRemaining = Math.max(0, (projectedBatteryAfterRoute / 100) * ebikeConfig.maxRangeMiles);
  const reserveLabel = projectedBatteryAfterRoute >= 25 ? 'OK' : projectedBatteryAfterRoute >= 15 ? 'WATCH' : 'CHARGE';
  const reserveColorClass = projectedBatteryAfterRoute >= 25
    ? 'bg-emerald-500 text-white'
    : projectedBatteryAfterRoute >= 15
      ? 'bg-amber-400 text-slate-950'
      : 'bg-rose-600 text-white ';

  const completedRouteAJobs = routeAJobs.filter(isJobCompleted);
  const remainingRouteAJobs = todayRouteJobs;
  const activeRouteAJobs = executableRouteJobs;
  const nextRouteAJob = activeRouteAJobs[0] || null;
  const nextStopIndex = nextRouteAJob ? routeAJobs.findIndex((job) => job.id === nextRouteAJob.id) : -1;
  const nextStopOrigin = nextStopIndex <= 0 ? startCoord : routeAJobs[nextStopIndex - 1].coordinates;
  const nextStopDistance = nextRouteAJob ? getDistanceInMiles(nextStopOrigin, nextRouteAJob.coordinates) : 0;
  const nextStopRideMinutes = nextRouteAJob ? Math.max(1, Math.round((nextStopDistance / ebikeConfig.avgSpeedMph) * 60)) : 0;
  const nextStopNavLink = nextRouteAJob
    ? `https://www.google.com/maps/dir/?api=1&origin=${nextStopOrigin.lat},${nextStopOrigin.lng}&destination=${nextRouteAJob.coordinates.lat},${nextRouteAJob.coordinates.lng}&travelmode=${travelMode}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(startAddress)}`;
  const routeProgressPct = routeAJobs.length > 0 ? Math.round((completedRouteAJobs.length / routeAJobs.length) * 100) : 100;
  const routeMilesRemaining = Math.max(0, activeMetrics.totalDistance - rideDistance);
  const routeListStops = remainingRouteAJobs;
  const routeListNavLink = (job: Job, idx: number) => {
    const origin = idx === 0
      ? startCoord
      : routeListStops[idx - 1]?.coordinates || startCoord;

    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${job.coordinates.lat},${job.coordinates.lng}&travelmode=${travelMode}`;
  };

  useEffect(() => {
    if (allJobs.length === 0) {
      prevJobsRef.current = allJobs;
      prevMetricsRef.current = activeMetrics;
      return;
    }

    if (prevJobsRef.current.length === 0) {
      prevJobsRef.current = allJobs;
      prevMetricsRef.current = activeMetrics;
      return;
    }

    const prevRouteA = prevJobsRef.current.filter((job) => job.routeId === 'A');
    const currRouteA = allJobs.filter((job) => job.routeId === 'A');

    const prevIds = prevRouteA.map((job) => `${job.id}-${job.status}-${job.routeId}`).join(',');
    const currIds = currRouteA.map((job) => `${job.id}-${job.status}-${job.routeId}`).join(',');

    if (prevIds === currIds) {
      return;
    }

    let why = 'Continuous Route Optimization executed.';
    const addedJob = currRouteA.find((job) => !prevRouteA.some((prev) => prev.id === job.id));
    const removedJob = prevRouteA.find((prev) => !currRouteA.some((job) => job.id === prev.id));
    const completedJob = currRouteA.find((job) => isJobCompleted(job) && prevRouteA.some((prev) => prev.id === job.id && !isJobCompleted(prev)));
    const uncompletedJob = currRouteA.find((job) => !isJobCompleted(job) && prevRouteA.some((prev) => prev.id === job.id && isJobCompleted(prev)));
    const movedRevision = currRouteA.find((job) => {
      const isRevision = isRevisionJob(job);
      if (!isRevision) return false;
      const prevIndex = prevRouteA.findIndex((prev) => prev.id === job.id);
      const currIndex = currRouteA.findIndex((current) => current.id === job.id);
      return prevIndex !== -1 && currIndex !== -1 && prevIndex !== currIndex;
    });

    if (addedJob) {
      if (isRevisionJob(addedJob)) {
        why = addedJob.smartMergeExplanation || `Required revision at '${addedJob.storeName}' was added. Smart Revision Merge automatically slotted it into the optimal position.`;
      } else {
        why = `New stop '${addedJob.storeName}' registered. Sequenced into the most efficient slot.`;
      }
    } else if (removedJob) {
      why = `Stop '${removedJob.storeName}' removed from Route A. Sequence recalculated to eliminate empty miles.`;
    } else if (completedJob) {
      if (isRevisionJob(completedJob)) {
        why = `Revision stop at '${completedJob.storeName}' marked completed. Sequence condensed.`;
      } else {
        why = `Stop '${completedJob.storeName}' marked completed. Active route updated.`;
      }
    } else if (uncompletedJob) {
      why = `Stop '${uncompletedJob.storeName}' marked pending. Route re-optimized.`;
    } else if (movedRevision) {
      why = movedRevision.smartMergeExplanation || `Revision '${movedRevision.storeName}' moved into the lowest-impact slot in today's route.`;
    } else {
      const editedJob = currRouteA.find((job) => {
        const prev = prevRouteA.find((prevJob) => prevJob.id === job.id);
        return prev && (prev.address !== job.address || prev.pay !== job.pay || prev.estimatedMinutes !== job.estimatedMinutes);
      });
      if (editedJob) {
        why = `Details for stop '${editedJob.storeName}' were edited. Re-evaluated route efficiency.`;
      } else {
        const movedToB = prevRouteA.find((prev) => !currRouteA.some((job) => job.id === prev.id) && allJobs.some((job) => job.id === prev.id && job.routeId === 'B'));
        if (movedToB) {
          why = `Outlier stop '${movedToB.storeName}' shifted to standby Route B. Route A recalculated.`;
        } else {
          why = 'Route A sequence modified. Re-optimized to protect hourly yield.';
        }
      }
    }

    const prevMetrics = prevMetricsRef.current || standardMetrics;
    const newMetrics = standardMetrics;

    const rideTimeDiff = Math.round(prevMetrics.totalRideTime - newMetrics.totalRideTime);
    const batteryDiff = parseFloat((prevMetrics.estimatedBatteryUsage - newMetrics.estimatedBatteryUsage).toFixed(1));
    const earningsDiff = parseFloat((newMetrics.earningsPerHour - prevMetrics.earningsPerHour).toFixed(2));

    setIsOptimizing(true);
    const timer = window.setTimeout(() => {
      setIsOptimizing(false);
    }, 1200);

    setLastOptimizationLog({
      why,
      minutesSaved: rideTimeDiff,
      batteryDifference: batteryDiff,
      earningsDifference: earningsDiff,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });

    prevJobsRef.current = allJobs;
    prevMetricsRef.current = activeMetrics;

    return () => clearTimeout(timer);
  }, [allJobs, activeMetrics, standardMetrics, startCoord, ebikeConfig]);

  const handleStartSimulation = () => {
    if (routeAJobs.length === 0) {
      alert('No active jobs on Route A to simulate!');
      return;
    }

    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
    }

    setIsSimulating(true);
    setSimulatedDistance(0);
    setSimulatedBattery(currentBattery);
    setSimulatedJobsCompleted([]);
    setSimulationStatus('Departing 1951 Golden State Ave Hub...');

    let currentPos = startCoord;
    const segments: { name: string; distance: number; jobId?: string }[] = [];

    for (const job of routeAJobs) {
      const dist = getDistanceInMiles(currentPos, job.coordinates);
      segments.push({
        name: `${job.storeName} at ${job.address.split(' ').slice(2).join(' ') || job.address}`,
        distance: dist,
        jobId: job.id,
      });
      currentPos = job.coordinates;
    }

    const returnDist = getDistanceInMiles(currentPos, startCoord);
    segments.push({
      name: 'Returning to Bakersfield Hub',
      distance: returnDist,
    });

    const totalDistToCover = activeMetrics.totalDistance;
    let distanceCovered = 0;

    const interval = window.setInterval(() => {
      const tickDist = 0.4;
      distanceCovered += tickDist;

      if (distanceCovered >= totalDistToCover) {
        setSimulatedDistance(totalDistToCover);
        const finalBattery = Math.max(0, currentBattery - (totalDistToCover * ebikeConfig.batteryPercentPerMile * batteryFactor));
        setSimulatedBattery(parseFloat(finalBattery.toFixed(1)));
        setSimulationStatus('Route Completed! Returned safely to the Golden State Ave Hub.');
        setIsSimulating(false);
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        return;
      }

      let tempCovered = distanceCovered;
      let activeSeg = segments[0];
      for (let i = 0; i < segments.length; i++) {
        if (tempCovered <= segments[i].distance) {
          activeSeg = segments[i];
          break;
        }
        tempCovered -= segments[i].distance;
      }

      const currentSegmentProgressPercent = Math.round((tempCovered / activeSeg.distance) * 100);

      const newlyCompleted: string[] = [];
      let accumulatedDist = 0;
      for (let i = 0; i < segments.length; i++) {
        accumulatedDist += segments[i].distance;
        if (distanceCovered >= accumulatedDist && segments[i].jobId) {
          newlyCompleted.push(segments[i].jobId!);
        }
      }
      setSimulatedJobsCompleted(newlyCompleted);

      const currentSimBattery = Math.max(0, currentBattery - (distanceCovered * ebikeConfig.batteryPercentPerMile * batteryFactor));

      setSimulatedDistance(parseFloat(distanceCovered.toFixed(1)));
      setSimulatedBattery(parseFloat(currentSimBattery.toFixed(1)));

      if (currentSimBattery <= 0) {
        setSimulationStatus(`Stranded! Battery depleted at ${parseFloat(distanceCovered.toFixed(1))} mi. Please recharge first.`);
        setIsSimulating(false);
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        return;
      }

      setSimulationStatus(`Riding to ${activeSeg.name}... ${currentSegmentProgressPercent}% complete.`);
    }, 300);

    simTimerRef.current = interval;
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  return {
    lastOptimizationLog,
    isOptimizing,
    isSimulating,
    simulatedDistance,
    simulatedBattery,
    simulationStatus,
    simulatedJobsCompleted,
    baseStandardMetrics,
    standardMetrics,
    activeMetrics,
    projectedBatteryAfterRoute,
    usableRangeRemaining,
    reserveLabel,
    reserveColorClass,
    completedRouteAJobs,
    remainingRouteAJobs,
    activeRouteAJobs,
    nextRouteAJob,
    routeProgressPct,
    routeMilesRemaining,
    outliersReport,
    outlierIds,
    nextStopIndex,
    nextStopOrigin,
    nextStopDistance,
    nextStopRideMinutes,
    nextStopNavLink,
    routeListStops,
    routeListNavLink,
    handleStartSimulation,
    handleStopSimulation,
  };
}
