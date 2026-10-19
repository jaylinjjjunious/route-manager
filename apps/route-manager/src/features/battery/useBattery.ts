/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
import type { EbikeConfig } from '../../types';
import safeStorage from '../../utils/safeStorage';
import {
  calculateBatteryDecisionMetrics,
  clampBatteryPercent,
  DEFAULT_EBIKE_CONFIG,
  getCombinedBatteryFactor,
  learnBatteryPercentPerMile,
  type BatteryDecisionInputs,
} from './batteryUtils';

function readNumber(key: string, fallback: number): number {
  const saved = safeStorage.getItem(key);
  if (saved === null || saved === '') return fallback;
  const parsed = Number(saved);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readEbikeConfig(): EbikeConfig {
  const saved = safeStorage.getItem('route_optimizer_config');
  if (!saved) return DEFAULT_EBIKE_CONFIG;

  try {
    return { ...DEFAULT_EBIKE_CONFIG, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_EBIKE_CONFIG;
  }
}

export function useBattery() {
  const [ebikeConfig, setEbikeConfig] = useState<EbikeConfig>(() => readEbikeConfig());
  const [currentBattery, setCurrentBatteryState] = useState<number>(() => readNumber('ebike_current_battery', 100));
  const [assistLevel, setAssistLevelState] = useState<number>(() => readNumber('ebike_assist_level', 3));
  const [riderWeight, setRiderWeightState] = useState<number>(() => readNumber('ebike_rider_weight', 175));
  const [cargoWeight, setCargoWeightState] = useState<number>(() => readNumber('ebike_cargo_weight', 15));
  const [weatherWind, setWeatherWindState] = useState<string>(() => safeStorage.getItem('ebike_weather_wind') || 'none');
  const [terrain, setTerrainState] = useState<string>(() => safeStorage.getItem('ebike_terrain') || 'flat');
  const [learnedBatteryPercentPerMile, setLearnedBatteryPercentPerMile] = useState<number>(() => {
    return readNumber('battery_tracker_learned_percent_per_mile', DEFAULT_EBIKE_CONFIG.batteryPercentPerMile);
  });

  const batteryFactor = useMemo(() => getCombinedBatteryFactor({
    assistLevel,
    riderWeight,
    cargoWeight,
    weatherWind,
    terrain,
  }), [assistLevel, riderWeight, cargoWeight, weatherWind, terrain]);

  const updateConfig = useCallback((updated: EbikeConfig) => {
    setEbikeConfig(updated);
    safeStorage.setItem('route_optimizer_config', JSON.stringify(updated));
  }, []);

  const setCurrentBattery = useCallback((value: number) => {
    const clamped = clampBatteryPercent(value);
    setCurrentBatteryState(clamped);
    safeStorage.setItem('ebike_current_battery', clamped.toString());
    return clamped;
  }, []);

  const setAssistLevel = useCallback((value: number) => {
    setAssistLevelState(value);
    safeStorage.setItem('ebike_assist_level', value.toString());
  }, []);

  const setRiderWeight = useCallback((value: number) => {
    setRiderWeightState(value);
    safeStorage.setItem('ebike_rider_weight', value.toString());
  }, []);

  const setCargoWeight = useCallback((value: number) => {
    setCargoWeightState(value);
    safeStorage.setItem('ebike_cargo_weight', value.toString());
  }, []);

  const setWeatherWind = useCallback((value: string) => {
    setWeatherWindState(value);
    safeStorage.setItem('ebike_weather_wind', value);
  }, []);

  const setTerrain = useCallback((value: string) => {
    setTerrainState(value);
    safeStorage.setItem('ebike_terrain', value);
  }, []);

  const learnFromRide = useCallback(({
    distance,
    estimatedBatteryUsed,
    startBattery,
  }: {
    distance: number;
    estimatedBatteryUsed: number;
    startBattery: number;
  }) => {
    const blendedRate = learnBatteryPercentPerMile({
      previousRate: learnedBatteryPercentPerMile,
      distance,
      estimatedBatteryUsed,
      startBattery,
      currentBattery,
    });

    if (blendedRate === null) return null;
    setLearnedBatteryPercentPerMile(blendedRate);
    safeStorage.setItem('battery_tracker_learned_percent_per_mile', blendedRate.toString());
    return blendedRate;
  }, [currentBattery, learnedBatteryPercentPerMile]);

  const restoreBattery = useCallback((value: number) => {
    return setCurrentBattery(value);
  }, [setCurrentBattery]);

  const getDecisionMetrics = useCallback((inputs: Omit<BatteryDecisionInputs, 'currentBattery' | 'learnedBatteryPercentPerMile' | 'batteryFactor'>) => {
    return calculateBatteryDecisionMetrics({
      ...inputs,
      currentBattery,
      learnedBatteryPercentPerMile,
      batteryFactor,
    });
  }, [batteryFactor, currentBattery, learnedBatteryPercentPerMile]);

  return {
    ebikeConfig,
    currentBattery,
    assistLevel,
    riderWeight,
    cargoWeight,
    weatherWind,
    terrain,
    learnedBatteryPercentPerMile,
    batteryFactor,
    updateConfig,
    setCurrentBattery,
    setAssistLevel,
    setRiderWeight,
    setCargoWeight,
    setWeatherWind,
    setTerrain,
    learnFromRide,
    restoreBattery,
    getDecisionMetrics,
  };
}
