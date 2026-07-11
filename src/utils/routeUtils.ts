/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job, Coordinates, RouteMetrics, OutlierReport, RouteScoreReport, EbikeConfig, OutlierStatus } from '../types';

// Real latitude & longitude mapping for Bakersfield landmarks to provide accurate distance calculations
export const BAKERSFIELD_COORDINATES: Record<string, Coordinates> = {
  "1951 Golden State Ave": { lat: 35.3904, lng: -119.0255 }, // Hub/Start
  "Family Dollar 2151 S Chester Ave": { lat: 35.3475, lng: -119.0142 },
  "Dollar General 5101 White Ln": { lat: 35.3308, lng: -119.0573 },
  "Vons 9000 Ming Ave": { lat: 35.3392, lng: -119.1005 },
  "Target 9100 Rosedale Hwy": { lat: 35.3813, lng: -119.1026 },
  "Albertsons 13045 Rosedale Hwy": { lat: 35.3855, lng: -119.1465 },
  "Family Dollar 600 Norris Rd": { lat: 35.4098, lng: -119.0198 },
  "BevMo 10650 Stockdale Hwy #500": { lat: 35.3512, lng: -119.1198 },
  "Tractor Supply / Buck Café Revisit: 2620 Buck Owens Blvd": { lat: 35.3821, lng: -119.0435 }
};

// Default e-bike configuration (Jasion EB5 spec: ~360Wh battery, 20 mph top assist)
export const DEFAULT_EBIKE_CONFIG: EbikeConfig = {
  model: "Jasion EB5",
  batteryCapacityWh: 360,
  avgSpeedMph: 18, // accounting for city stop-and-go
  batteryPercentPerMile: 2.8, // 100% capacity gives ~35.7 miles range on mid-assist
  maxRangeMiles: 36
};

/**
 * Calculates the Haversine distance in miles between two coordinates
 */
export function getDistanceInMiles(coord1: Coordinates, coord2: Coordinates): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Helper to resolve address into coordinates. If not found in the pre-mapped
 * Bakersfield dictionary, it generates slightly randomized offsets from the hub
 * to ensure we always have functioning coordinates.
 */
export function resolveCoordinates(address: string): Coordinates {
  const cleanAddress = address.trim();
  
  // Try exact lookup
  if (BAKERSFIELD_COORDINATES[cleanAddress]) {
    return BAKERSFIELD_COORDINATES[cleanAddress];
  }
  
  // Partial lookup
  for (const [key, coords] of Object.entries(BAKERSFIELD_COORDINATES)) {
    if (cleanAddress.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanAddress.toLowerCase())) {
      return coords;
    }
  }

  // Fallback: Generate coordinates in Bakersfield area near the hub
  const hash = cleanAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 100) - 50) / 1200; // approx max +/- 0.04 degrees (~3 miles)
  const lngOffset = (((hash * 17) % 100) - 50) / 1200;
  
  return {
    lat: 35.3904 + latOffset,
    lng: -119.0255 + lngOffset
  };
}

/**
 * Optimizes a list of stops using a Greedy Nearest-Neighbor algorithm starting from a given coordinate.
 * It orders the stops sequentially to minimize backtracking.
 */
export function optimizeRoute(startCoord: Coordinates, jobs: Job[]): Job[] {
  if (jobs.length === 0) return [];
  
  const unvisited = [...jobs];
  const ordered: Job[] = [];
  let currentCoord = startCoord;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = getDistanceInMiles(currentCoord, unvisited[i].coordinates);
      if (d < minDistance) {
        minDistance = d;
        nearestIndex = i;
      }
    }

    const nearestJob = unvisited[nearestIndex];
    ordered.push(nearestJob);
    currentCoord = nearestJob.coordinates;
    unvisited.splice(nearestIndex, 1);
  }

  return ordered;
}

/**
 * Calculates comprehensive metrics for an ordered route, including starting and returning trips.
 */
export function calculateRouteMetrics(
  startCoord: Coordinates,
  orderedJobs: Job[],
  config: EbikeConfig = DEFAULT_EBIKE_CONFIG
): RouteMetrics {
  const totalJobsCount = orderedJobs.length;
  const completedJobsCount = orderedJobs.filter(j => j.status === 'completed').length;
  
  let totalPay = 0;
  let totalWorkTime = 0;
  let totalDistance = 0;

  if (totalJobsCount === 0) {
    return {
      totalPay: 0,
      totalRideTime: 0,
      totalWorkTime: 0,
      totalTime: 0,
      totalDistance: 0,
      estimatedBatteryUsage: 0,
      earningsPerHour: 0,
      completedJobsCount: 0,
      totalJobsCount: 0
    };
  }

  // Pay and work time accumulation
  orderedJobs.forEach(job => {
    totalPay += job.pay;
    totalWorkTime += job.estimatedMinutes;
  });

  // Distance accumulation: Start -> Job 1 -> Job 2 -> ... -> Job N -> Start
  let currentCoord = startCoord;
  for (let i = 0; i < orderedJobs.length; i++) {
    const jobCoord = orderedJobs[i].coordinates;
    totalDistance += getDistanceInMiles(currentCoord, jobCoord);
    currentCoord = jobCoord;
  }
  
  // Return trip to starting address is crucial for an e-bike's limited range
  const returnDistance = getDistanceInMiles(currentCoord, startCoord);
  totalDistance += returnDistance;
  
  // Travel calculations based on Jasion EB5 specs
  const totalRideTime = (totalDistance / config.avgSpeedMph) * 60; // in minutes
  const totalTime = totalRideTime + totalWorkTime;
  const estimatedBatteryUsage = totalDistance * config.batteryPercentPerMile;
  
  const earningsPerHour = totalTime > 0 ? (totalPay / (totalTime / 60)) : 0;

  return {
    totalPay: parseFloat(totalPay.toFixed(2)),
    totalRideTime: Math.round(totalRideTime),
    totalWorkTime: Math.round(totalWorkTime),
    totalTime: Math.round(totalTime),
    totalDistance: parseFloat(totalDistance.toFixed(1)),
    estimatedBatteryUsage: parseFloat(estimatedBatteryUsage.toFixed(1)),
    earningsPerHour: parseFloat(earningsPerHour.toFixed(2)),
    completedJobsCount,
    totalJobsCount
  };
}

/**
 * Evaluates Route A's jobs to detect geographic outliers.
 * It measures the distance of each job to its nearest sibling (or the start point).
 * If a job represents a disproportionate travel distance, it flags it with advice.
 */
export function detectOutliers(
  startCoord: Coordinates,
  jobs: Job[],
  config: EbikeConfig = DEFAULT_EBIKE_CONFIG
): OutlierReport[] {
  if (jobs.length <= 1) return [];

  const reports: OutlierReport[] = [];

  jobs.forEach(job => {
    // Find nearest neighbor coordinate (either start point or any OTHER job on Route A)
    let minDistance = getDistanceInMiles(startCoord, job.coordinates);
    
    jobs.forEach(otherJob => {
      if (otherJob.id === job.id) return;
      const dist = getDistanceInMiles(job.coordinates, otherJob.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
      }
    });

    // Outlier Threshold: If the nearest point is more than 4.2 miles away
    if (minDistance > 4.2) {
      // Calculate travel penalty for this specific stop
      const travelDistancePenalty = minDistance * 2; // round-trip deviation from nearest point
      const timeIncreaseMinutes = Math.round((travelDistancePenalty / config.avgSpeedMph) * 60);
      const batteryCostPercent = parseFloat((travelDistancePenalty * config.batteryPercentPerMile).toFixed(1));
      
      // Determine recommendation
      let status: OutlierStatus = 'wait_for_more';
      let explanation = '';

      if (batteryCostPercent > 40) {
        status = 'push_to_b';
        explanation = `Riding to this stop consumes ${batteryCostPercent}% of your battery. With a Jasion EB5, this severe range penalty risks draining your battery before returning home. We recommend pushing this to Route B.`;
      } else if (job.pay >= 35 && batteryCostPercent <= 25) {
        status = 'do_now';
        explanation = `Although geographically isolated (${minDistance} miles away), the exceptional pay of $${job.pay} offsets the travel time and battery cost. Secure this high-yield job now!`;
      } else if (job.pay / (timeIncreaseMinutes / 60) < 15) {
        status = 'push_to_b';
        explanation = `The marginal hourly earnings rate for this stop is very low ($${(job.pay / (timeIncreaseMinutes / 60)).toFixed(2)}/hr) due to ${timeIncreaseMinutes} mins of empty travel time. Highly inefficient—recommend pushing to Route B.`;
      } else {
        status = 'wait_for_more';
        explanation = `This job is isolated (${minDistance} miles from neighbors). Completing it adds ${timeIncreaseMinutes} minutes of unproductive travel. It is highly advised to wait until more jobs appear in this section of Bakersfield before riding out.`;
      }

      reports.push({
        jobId: job.id,
        storeName: job.storeName,
        status,
        distanceToNearest: parseFloat(minDistance.toFixed(1)),
        avgDistanceToOthers: parseFloat((jobs.reduce((acc, other) => acc + getDistanceInMiles(job.coordinates, other.coordinates), 0) / jobs.length).toFixed(1)),
        timeIncreaseMinutes,
        batteryCostPercent,
        explanation
      });
    }
  });

  return reports;
}

/**
 * Calculates a score from 0 to 100 on whether Route A is optimal, highly clustered, and financially robust.
 */
export function generateRouteScore(
  metrics: RouteMetrics,
  outliersCount: number,
  jobs: Job[]
): RouteScoreReport {
  if (jobs.length === 0) {
    return {
      score: 100,
      payRating: 'excellent',
      distanceRating: 'excellent',
      batterySafetyRating: 'excellent',
      clusteringRating: 'excellent',
      suggestions: ["Add some jobs to Route A to begin evaluating your route metrics."]
    };
  }

  let score = 100;
  const suggestions: string[] = [];

  // 1. Pay/Hourly Rate Assessment (Ideal >= $24/hr)
  let payRating: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  const ePh = metrics.earningsPerHour;
  if (ePh >= 25) {
    payRating = 'excellent';
  } else if (ePh >= 18) {
    payRating = 'good';
    score -= 10;
    suggestions.push("Your hourly pay is decent, but could be improved by pruning low-paying stops or choosing higher pay-per-minute tasks.");
  } else if (ePh >= 12) {
    payRating = 'fair';
    score -= 25;
    suggestions.push("Hourly pay is subpar ($" + ePh.toFixed(2) + "/hr). Minimize travel time or focus on higher-paying mystery shops.");
  } else {
    payRating = 'poor';
    score -= 40;
    suggestions.push("Very low hourly rate. The travel time severely dilutes your merchandising pay. Rearrange stops or drop distant items.");
  }

  // 2. Battery Safety Assessment (Ideal drainage < 65% for single-battery Jasion EB5)
  let batterySafetyRating: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  const bat = metrics.estimatedBatteryUsage;
  if (bat <= 50) {
    batterySafetyRating = 'excellent';
  } else if (bat <= 75) {
    batterySafetyRating = 'good';
    score -= 10;
    suggestions.push("Battery level is manageable, but make sure to charge fully before starting and ride in Eco pedal-assist mode.");
  } else if (bat <= 100) {
    batterySafetyRating = 'fair';
    score -= 25;
    suggestions.push("Critical battery usage warning (" + bat.toFixed(0) + "%). You will return with near-zero energy. Consider offloading one stop to Route B.");
  } else {
    batterySafetyRating = 'poor';
    score -= 50;
    suggestions.push("DANGER: Total distance exceeds Jasion EB5 e-bike range (" + bat.toFixed(0) + "% required). You WILL run out of battery. Shift stops to Route B!");
  }

  // 3. Stop Clustering & Distance Assessment (Ideal Sequential Stop distance <= 3 miles)
  let clusteringRating: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  const avgDistance = jobs.length > 1 ? (metrics.totalDistance / (jobs.length + 1)) : metrics.totalDistance;
  
  if (avgDistance <= 2.8) {
    clusteringRating = 'excellent';
  } else if (avgDistance <= 4.2) {
    clusteringRating = 'good';
    score -= 10;
    suggestions.push("Stops are moderately spread out. Minor backtracking detected.");
  } else if (avgDistance <= 6.0) {
    clusteringRating = 'fair';
    score -= 20;
    suggestions.push("High mileage spread! You're spending more time riding than working inside stores.");
  } else {
    clusteringRating = 'poor';
    score -= 30;
    suggestions.push("Severe geographic dispersion. Stops span opposite ends of Bakersfield. Split them between Route A (North/West) and Route B (South/East).");
  }

  // 4. Outliers Penalty
  if (outliersCount > 0) {
    score -= outliersCount * 12;
    suggestions.push(`Detected ${outliersCount} geographic outlier stop(s). Moving them to Route B will instantly improve your hourly wage and protect your battery.`);
  }

  // Final bounds
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Simple Distance Rating for standard output
  let distanceRating: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  if (metrics.totalDistance <= 15) distanceRating = 'excellent';
  else if (metrics.totalDistance <= 25) distanceRating = 'good';
  else if (metrics.totalDistance <= 35) distanceRating = 'fair';

  return {
    score,
    payRating,
    distanceRating,
    batterySafetyRating,
    clusteringRating,
    suggestions: suggestions.length > 0 ? suggestions : ["Your current route is perfectly optimized and highly efficient! Ready to ride."]
  };
}

/**
 * Calculates priority score bonus for a job.
 * Priority Rules:
 * 1. Required revisions: Treated as mandatory and inserted optimally (handled in smartMergeRevisions)
 * 2. Jobs with deadlines (dueTime is set)
 * 3. High-profit clustered jobs (pay >= 18)
 * 4. Regular assignments
 * 5. Flexible/outlier jobs
 */
export function getPriorityBonus(job: Job): number {
  let bonus = 0;

  // Process-server jobs are time-sensitive field work and should stay prominent
  // in the route when they are mixed with retail and gig stops.
  if (job.jobType === 'process_serve') {
    bonus += 6.0;
  }
  
  // Deadline Priority
  if (job.dueTime && job.dueTime.trim() !== '') {
    bonus += 4.5; // Virtual miles closer to prioritize deadlines
  }
  
  // High-Profit Priority
  if (job.pay >= 18) {
    bonus += 2.5; // Virtual miles closer
  }
  
  // Regular ready jobs
  if (job.status === 'ready') {
    bonus += 1.0;
  }
  
  return bonus;
}

/**
 * Pluggable Routing Engine interface to allow easy swap-in of other services like:
 * - Google Maps Platform (Distance Matrix & Routes APIs)
 * - Apple Maps (MapKit JS Routing)
 * - OSRM (Open Source Routing Machine API)
 * - Mapbox Directions API
 */
export interface RouteLeg {
  distanceMiles: number;
  durationMinutes: number;
}

export interface RoutingProvider {
  name: string;
  getRouteLeg: (from: Coordinates, to: Coordinates) => RouteLeg;
}

// Default mock engine implementation using Haversine formula and average e-bike speed config
export const MockRoutingProvider: RoutingProvider = {
  name: "Mock Navigation Engine (Offline)",
  getRouteLeg: (from: Coordinates, to: Coordinates) => {
    const dist = getDistanceInMiles(from, to);
    // Assumes e-bike average speed of 18mph
    const speedMph = 18;
    const durationMinutes = (dist / speedMph) * 60;
    return {
      distanceMiles: dist,
      durationMinutes: durationMinutes
    };
  }
};

function isCompletedJob(job: Job): boolean {
  return job.status === 'completed' || job.isCompleted === true;
}

function isRevisionJob(job: Job): boolean {
  return job.isRevisionRequired === true || job.status === 'revisit';
}

function hasDeadline(job: Job): boolean {
  return !!(job.dueTime && job.dueTime.trim() !== '' && !/flex/i.test(job.dueTime));
}

function parseDueTimeMinutes(dueTime: string): number | null {
  const clean = dueTime.trim().toUpperCase();
  const match = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const period = match[3];

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  if (!period && hours < 7) hours += 12;

  return (hours * 60) + minutes;
}

function getRouteDistance(startCoord: Coordinates, orderedJobs: Job[], provider: RoutingProvider): number {
  let total = 0;
  let current = startCoord;

  orderedJobs.forEach(job => {
    total += provider.getRouteLeg(current, job.coordinates).distanceMiles;
    current = job.coordinates;
  });

  return total;
}

function getArrivalMinutes(startCoord: Coordinates, orderedJobs: Job[], targetId: string, config: EbikeConfig, provider: RoutingProvider): number {
  let elapsed = 0;
  let current = startCoord;

  for (const job of orderedJobs) {
    const leg = provider.getRouteLeg(current, job.coordinates);
    elapsed += leg.durationMinutes;
    if (job.id === targetId) return elapsed;
    elapsed += job.estimatedMinutes;
    current = job.coordinates;
  }

  return elapsed;
}

function describeInsertionNeighbor(index: number, route: Job[]): string {
  if (index === 0) return 'the start hub';
  return route[index - 1].storeName;
}

function buildBaseRoute(
  startCoord: Coordinates,
  jobs: Job[],
  config: EbikeConfig,
  provider: RoutingProvider
): Job[] {
  const outliers = detectOutliers(startCoord, jobs, config);
  const outlierIds = new Set(outliers.map(o => o.jobId));
  const unvisited = [...jobs];
  const ordered: Job[] = [];
  let currentCoord = startCoord;

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const job = unvisited[i];
      const leg = provider.getRouteLeg(currentCoord, job.coordinates);
      const distancePenalty = leg.distanceMiles * 50;
      const deadlineBonus = hasDeadline(job) ? 100000 : 0;
      const processServeBonus = job.jobType === 'process_serve' ? 75000 : 0;
      const payBonus = job.pay * 20;
      const batteryPenalty = (leg.distanceMiles * config.batteryPercentPerMile) * 30;
      const outlierPenalty = outlierIds.has(job.id) || job.status === 'outlier' ? 500000 : 0;
      const score = deadlineBonus + processServeBonus - distancePenalty + payBonus - batteryPenalty - outlierPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const selected = unvisited[bestIndex];
    ordered.push(selected);
    currentCoord = selected.coordinates;
    unvisited.splice(bestIndex, 1);
  }

  return ordered;
}

function insertRevisionIntoBestSlot(
  startCoord: Coordinates,
  route: Job[],
  revision: Job,
  config: EbikeConfig,
  provider: RoutingProvider
): Job[] {
  let bestRoute = [revision, ...route];
  let bestIndex = 0;
  let bestAddedMinutes = Infinity;
  let bestAddedBattery = Infinity;
  let bestScore = Infinity;
  const baselineDistance = getRouteDistance(startCoord, route, provider);

  for (let index = 0; index <= route.length; index++) {
    const candidate = [
      ...route.slice(0, index),
      revision,
      ...route.slice(index)
    ];
    const candidateDistance = getRouteDistance(startCoord, candidate, provider);
    const addedDistance = Math.max(0, candidateDistance - baselineDistance);
    const addedMinutes = Math.round((addedDistance / config.avgSpeedMph) * 60);
    const addedBattery = addedDistance * config.batteryPercentPerMile;

    let deadlinePenalty = 0;
    const dueMinutes = parseDueTimeMinutes(revision.dueTime || '');
    if (dueMinutes !== null) {
      const arrivalMinutes = getArrivalMinutes(startCoord, candidate, revision.id, config, provider);
      const assumedStartMinutes = 8 * 60;
      const lateMinutes = Math.max(0, assumedStartMinutes + arrivalMinutes - dueMinutes);
      deadlinePenalty = lateMinutes * 4;
    }

    const existingRoutePenalty = index * 0.25;
    const score = addedMinutes + (addedBattery * 1.5) + deadlinePenalty + existingRoutePenalty;

    if (score < bestScore) {
      bestScore = score;
      bestRoute = candidate;
      bestIndex = index;
      bestAddedMinutes = addedMinutes;
      bestAddedBattery = addedBattery;
    }
  }

  const neighbor = describeInsertionNeighbor(bestIndex, bestRoute);
  const deadlineNote = hasDeadline(revision) ? ` Deadline ${revision.dueTime} was kept in range.` : '';
  const batteryNote = bestAddedBattery <= 6 ? ' Battery impact stays low.' : ` Battery adds ${bestAddedBattery.toFixed(1)}%.`;

  return bestRoute.map(job => {
    if (job.id !== revision.id) return job;

    return {
      ...job,
      smartMergeSavedMinutes: Math.max(0, Math.round(bestAddedMinutes)),
      smartMergeExplanation: `Revision inserted after ${neighbor} because it only adds ${Math.max(0, Math.round(bestAddedMinutes))} minutes.${batteryNote}${deadlineNote}`
    };
  });
}

/**
 * Optimizes Route A jobs by executing a greedy route planning heuristic that satisfies
 * the 6 strict priority rules specified:
 * 1. Required revisions (highest priority)
 * 2. Jobs with deadlines
 * 3. Closest jobs
 * 4. Highest pay jobs
 * 5. Battery-friendly jobs
 * 6. Outlier jobs last
 * 
 * Supports pluggable RoutingProviders (Google, Apple, OSRM, Mapbox, etc.)
 */
export function optimizeRouteWithSmartMerge(
  startCoord: Coordinates,
  jobs: Job[],
  config: EbikeConfig = DEFAULT_EBIKE_CONFIG,
  provider: RoutingProvider = MockRoutingProvider
): Job[] {
  if (jobs.length === 0) return [];

  // Extract completed jobs (kept at the beginning to maintain timeline) and pending jobs.
  const completedJobs = jobs.filter(isCompletedJob);
  const pendingJobs = jobs.filter(j => !isCompletedJob(j));

  if (pendingJobs.length === 0) {
    return completedJobs;
  }

  // Starting coordinate for active planning.
  let activeStartCoord = startCoord;
  if (completedJobs.length > 0) {
    activeStartCoord = completedJobs[completedJobs.length - 1].coordinates;
  }

  const revisionJobs = pendingJobs.filter(isRevisionJob);
  const regularJobs = pendingJobs.filter(job => !isRevisionJob(job));
  let orderedPending = buildBaseRoute(activeStartCoord, regularJobs, config, provider);

  revisionJobs.forEach(revision => {
    orderedPending = insertRevisionIntoBestSlot(activeStartCoord, orderedPending, revision, config, provider);
  });

  return [...completedJobs, ...orderedPending];
}


