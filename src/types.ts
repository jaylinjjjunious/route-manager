/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JobType = 'retail_audit' | 'merchandising' | 'mystery_shop' | 'field_task' | 'process_serve';

export type JobStatus = 'ready' | 'revisit' | 'completed' | 'pending' | 'postponed' | 'outlier';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Job {
  id: string;
  storeName: string;
  address: string;
  pay: number;
  estimatedMinutes: number; // Time spent inside store
  jobType: JobType;
  dueTime: string; // e.g. "17:00" or "05:00 PM"
  notes: string;
  status: JobStatus;
  routeId: 'A' | 'B';
  coordinates: Coordinates;
  smartMergeExplanation?: string;
  smartMergeSavedMinutes?: number;
  priority?: 'low' | 'medium' | 'high';
  isRevisionRequired?: boolean;
  isCompleted?: boolean;
  deadline?: string;
  revisionStatus?: string; // e.g. "Draft", "Approved", "Needs Revision", "Under Review"
}

export interface RouteMetrics {
  totalPay: number;
  totalRideTime: number; // in minutes
  totalWorkTime: number; // in minutes
  totalTime: number; // total ride + work time in minutes
  totalDistance: number; // in miles
  estimatedBatteryUsage: number; // percentage (0-100+)
  earningsPerHour: number;
  completedJobsCount: number;
  totalJobsCount: number;
  isGoogleLive?: boolean;
}

export type OutlierStatus = 'do_now' | 'push_to_b' | 'wait_for_more';

export interface OutlierReport {
  jobId: string;
  storeName: string;
  status: OutlierStatus;
  distanceToNearest: number; // miles
  avgDistanceToOthers: number; // miles
  timeIncreaseMinutes: number;
  batteryCostPercent: number;
  explanation: string;
}

export interface RouteScoreReport {
  score: number; // 0 to 100
  payRating: 'excellent' | 'good' | 'fair' | 'poor';
  distanceRating: 'excellent' | 'good' | 'fair' | 'poor';
  batterySafetyRating: 'excellent' | 'good' | 'fair' | 'poor';
  clusteringRating: 'excellent' | 'good' | 'fair' | 'poor';
  suggestions: string[];
}

export interface EbikeConfig {
  model: string;
  batteryCapacityWh: number;
  avgSpeedMph: number;
  batteryPercentPerMile: number; // standard battery drainage rate per mile
  maxRangeMiles: number;
}

export type DispatcherIntentType = 
  | 'COMPLETE_JOB'
  | 'ADD_JOB'
  | 'EDIT_JOB'
  | 'MOVE_TO_TOMORROW'
  | 'MOVE_TO_ROUTE_B'
  | 'UPDATE_BATTERY'
  | 'GET_NEXT_STOP'
  | 'GET_REMAINING_JOBS'
  | 'REOPTIMIZE_ROUTE'
  | 'END_DAY_SUMMARY'
  | 'NONE';

export interface DispatcherAction {
  type: DispatcherIntentType;
  jobTarget?: string;
  jobData?: Partial<Job>;
  batteryValue?: number;
  requiresConfirmation?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: DispatcherAction;
  undone?: boolean;
}

