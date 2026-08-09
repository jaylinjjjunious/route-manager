/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EbikeConfig } from '../../types';

export type BatteryRisk = 'Low' | 'Watch' | 'High';

export const DEFAULT_EBIKE_CONFIG: EbikeConfig = {
  model: 'Jasion EB5',
  batteryCapacityWh: 360,
  avgSpeedMph: 18, // accounting for city stop-and-go
  batteryPercentPerMile: 2.8, // 100% capacity gives ~35.7 miles range on mid-assist
  maxRangeMiles: 36,
};

export interface BatteryFactorInputs {
  assistLevel: number;
  riderWeight: number;
  cargoWeight: number;
  weatherWind: string;
  terrain: string;
}

export interface BatteryDecisionInputs {
  currentBattery: number;
  rideBatteryUsed: number;
  learnedBatteryPercentPerMile: number;
  batteryFactor: number;
  routeMilesRemaining: number;
  projectedBatteryAfterRoute: number;
}

export interface BatteryDecisionMetrics {
  learnedBatteryRate: number;
  batteryTrackerUsed: number;
  batteryTrackerCurrent: number;
  estimatedMilesRemaining: number;
  batteryRisk: BatteryRisk;
  canFinishRoute: boolean;
  rechargeRecommended: boolean;
  batteryToneClass: string;
}

export function clampBatteryPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function getCombinedBatteryFactor({
  assistLevel,
  riderWeight,
  cargoWeight,
  weatherWind,
  terrain,
}: BatteryFactorInputs): number {
  let assistFactor = 1.0;
  if (assistLevel === 1) assistFactor = 0.55;
  else if (assistLevel === 2) assistFactor = 0.75;
  else if (assistLevel === 3) assistFactor = 1.0;
  else if (assistLevel === 4) assistFactor = 1.25;
  else if (assistLevel === 5) assistFactor = 1.55;

  const weightFactor = (riderWeight + cargoWeight) / 190;

  let windFactor = 1.0;
  if (weatherWind === 'headwind_light') windFactor = 1.15;
  else if (weatherWind === 'headwind_strong') windFactor = 1.35;
  else if (weatherWind === 'tailwind') windFactor = 0.90;

  let terrainFactor = 1.0;
  if (terrain === 'rolling') terrainFactor = 1.15;
  else if (terrain === 'hilly') terrainFactor = 1.35;

  return assistFactor * weightFactor * windFactor * terrainFactor;
}

export function calculateBatteryDecisionMetrics({
  currentBattery,
  rideBatteryUsed,
  learnedBatteryPercentPerMile,
  batteryFactor,
  routeMilesRemaining,
  projectedBatteryAfterRoute,
}: BatteryDecisionInputs): BatteryDecisionMetrics {
  const learnedBatteryRate = learnedBatteryPercentPerMile * batteryFactor;
  const batteryTrackerUsed = rideBatteryUsed;
  const batteryTrackerCurrent = Math.max(0, Math.round(currentBattery - batteryTrackerUsed));
  const estimatedMilesRemaining = learnedBatteryRate > 0 ? parseFloat((batteryTrackerCurrent / learnedBatteryRate).toFixed(1)) : 0;
  const batteryRisk: BatteryRisk = batteryTrackerCurrent < 15 || estimatedMilesRemaining < routeMilesRemaining
    ? 'High'
    : batteryTrackerCurrent < 25 || estimatedMilesRemaining < routeMilesRemaining + 3
      ? 'Watch'
      : 'Low';
  const canFinishRoute = estimatedMilesRemaining >= routeMilesRemaining && batteryTrackerCurrent >= 15;
  const rechargeRecommended = batteryRisk === 'High' || !canFinishRoute;
  const batteryToneClass = projectedBatteryAfterRoute >= 25
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    : projectedBatteryAfterRoute >= 15
      ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
      : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100';

  return {
    learnedBatteryRate,
    batteryTrackerUsed,
    batteryTrackerCurrent,
    estimatedMilesRemaining,
    batteryRisk,
    canFinishRoute,
    rechargeRecommended,
    batteryToneClass,
  };
}

export function learnBatteryPercentPerMile({
  previousRate,
  distance,
  estimatedBatteryUsed,
  startBattery,
  currentBattery,
}: {
  previousRate: number;
  distance: number;
  estimatedBatteryUsed: number;
  startBattery: number;
  currentBattery: number;
}): number | null {
  const observedBatteryUsed = Math.max(0, startBattery - currentBattery);
  const learningBatteryUsed = observedBatteryUsed > 0 ? observedBatteryUsed : estimatedBatteryUsed;
  if (distance <= 0 || learningBatteryUsed <= 0) return null;

  const sampleRate = learningBatteryUsed / distance;
  return parseFloat(((previousRate * 0.75) + (sampleRate * 0.25)).toFixed(2));
}
