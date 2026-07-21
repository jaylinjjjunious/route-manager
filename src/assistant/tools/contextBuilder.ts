import type { AppContext } from '../assistantTypes';
import type { Job, EbikeConfig, RouteMetrics } from '../../types';
import { isJobCompleted } from '../../utils/jobState';
import { getCurrentCycleId, getCycleLabel, getNextResetTime } from '../../utils/showerCycle';

export interface BuildContextInput {
  jobs: Job[];
  routeAJobs: Job[];
  currentBattery: number;
  showerGateUnlocked: boolean;
  currentTab: string;
  theme: 'light' | 'dark';
  weatherWind: string;
  terrain: string;
  ebikeConfig: EbikeConfig;
  activeMetrics: RouteMetrics;
  onlineStatus: boolean;
  dayEarnings: number;
  currentStopName: string | null;
}

export function buildAppContext(input: BuildContextInput): AppContext {
  const now = new Date();
  const cycleId = getCurrentCycleId(now);
  const cycleLabel = getCycleLabel(cycleId);
  const nextReset = getNextResetTime(now);
  const remainingJobs = input.routeAJobs.filter(j => !isJobCompleted(j));

  return {
    currentPage: input.currentTab,
    localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cycleId,
    showerGateComplete: input.showerGateUnlocked,
    showerGateLabel: cycleLabel,
    nextShowerReset: nextReset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    protectedPagesLocked: !input.showerGateUnlocked,
    jobCount: input.jobs.length,
    remainingJobCount: remainingJobs.length,
    nextJobName: input.currentStopName,
    batteryPercent: input.currentBattery,
    estimatedRange: Math.round((input.currentBattery / 100) * input.ebikeConfig.maxRangeMiles),
    weatherWind: input.weatherWind,
    terrain: input.terrain,
    routeActive: input.jobs.length > 0,
    onlineStatus: navigator.onLine,
    theme: input.theme,
    dayEarnings: input.dayEarnings
  };
}
