import type { Job, EbikeConfig } from '../../types';

export interface RideTrackerSession {
  id: string;
  date: string;
  startedAt: string | null;
  endedAt: string;
  rideTime: number;
  storeTime: number;
  totalDayTime: number;
  startBattery: number;
  endBattery: number;
  batteryUsed: number;
  jobsCompletedCount: number;
  completedJobNames: string[];
  distance: number;
  estimatedEarnings: number;
  earningsPerHour: number;
  avgRideSpeed: number;
  learnedRange: number | null;
}

export interface RideSummary {
  totalRideTime: string;
  totalStoreTime: string;
  totalJobsCompleted: number;
  totalDistance: number;
  estimatedBatteryUsed: number;
  estimatedEarnings: number;
  earningsPerHour: number;
  routeScore: number;
  efficiencyScore: number;
  timeSaved: number;
  jobsMovedToTomorrow: number;
  avgRideSpeed: number;
  stopsCompleted: number;
  startedAt: string | null;
  endedAt: string;
}

export interface RideTrackerTabProps {
  trackerStatus: 'idle' | 'riding' | 'at_store' | 'completed';
  trackerRideTime: number;
  trackerStoreTime: number;
  trackerTotalDayTime: number;
  trackerStartBattery: number;
  currentBattery: number;
  trackerJobsCompleted: string[];
  trackerSessions: RideTrackerSession[];
  rideStartedAt: string | null;
  ebikeConfig: EbikeConfig;
  jobs: Job[];
  routeAJobs: Job[];
  completedRouteAJobs: Job[];
  isJobDone: (job: Job) => boolean;
  tomorrowJobs: Job[];
  onStartRide: () => void;
  onArrivedAtStore: () => void;
  onResumeRide: () => void;
  onEndDay: () => void;
  onResetCurrentSession: () => void;
  onToggleJobComplete: (jobId: string) => void;
  onClearHistory: () => void;
  onMoveUnfinishedToTomorrow: () => void;
}

export interface FinishTrackerDayParams {
  endBattery: number;
  completedJobNames: string[];
  estimatedEarnings: number;
}

export interface UseRideTrackerReturn {
  // Core tracker state
  status: 'idle' | 'riding' | 'at_store' | 'completed';
  rideTime: number;
  storeTime: number;
  totalDayTime: number;
  startBattery: number;
  jobsCompleted: string[];
  rideModeActive: boolean;
  rideStartedAt: string | null;
  rideSummary: RideSummary | null;
  sessions: RideTrackerSession[];

  // Derived tracker values
  isWorkSessionActive: boolean;
  rideDistance: number;
  rideBatteryUsed: number;
  rideAverageSpeed: string;
  formatRideEarningsPerHour: (earned: number) => string;

  // Feature-owned actions
  startSession: (startBattery: number) => void;
  setRiding: () => void;
  setAtStore: () => void;
  setCompleted: () => void;
  resetSession: () => void;
  toggleJobInSession: (jobId: string) => void;
  trackJobCompletion: (jobId: string, estimatedMinutes: number) => void;
  clearHistory: () => void;
  enterRideMode: (startedAt: string, startBattery: number) => void;
  exitRideMode: () => void;
  setRideSummary: (summary: RideSummary | null) => void;
  addSession: (session: RideTrackerSession) => void;
  finishTrackerDay: (params: FinishTrackerDayParams) => RideTrackerSession;
}

export interface RideModeSurfaceProps {
  onEndRideMode: () => void;
  nextRouteAJob: Job | null;
  completingJobIds: string[];
  nextStopNavLink: string;
  onToggleComplete: (id: string) => void;
  onMarkUnderReview: (id: string) => void;
  routeListStops: Job[];
  getRouteBadgeClasses: (job: Job) => string;
  getRouteBadgeLabel: (job: Job) => string;
  getStreetName: (address: string) => string;
  formatDuration: (seconds: number) => string;
  trackerTotalDayTime: number;
  trackerRideTime: number;
  trackerStoreTime: number;
  rideBatteryUsed: number;
  remainingRouteAJobs: Job[];
  completedRouteAJobs: Job[];
  rideDistance: number;
  rideEarningsPerHour: string;
  rideAverageSpeed: string;
  rideEarned: number;
  trackerJobsCompleted: string[];
}
