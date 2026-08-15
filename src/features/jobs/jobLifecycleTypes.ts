export type JobCategory = 'technician' | 'process_serving' | 'audits_merchandising';

export type JobLifecycleStatus =
  | 'planned'
  | 'ready'
  | 'arrived'
  | 'in_progress'
  | 'work_complete_pending_closeout'
  | 'completed'
  | 'cancelled';

export type JobWorkState =
  | 'not_started'
  | 'ready_to_start'
  | 'working'
  | 'paused'
  | 'awaiting_support'
  | 'blocked_before_start'
  | 'blocked_onsite'
  | 'offsite';

export type VisitEndReason =
  | 'completed_work'
  | 'missing_part'
  | 'awaiting_support'
  | 'customer_not_ready'
  | 'access_denied'
  | 'reschedule_required'
  | 'safety_issue'
  | 'other';

export type LifecycleEventType =
  | 'arrived'
  | 'ready_to_start'
  | 'blocked_before_start'
  | 'started_work'
  | 'paused'
  | 'resumed_work'
  | 'awaiting_support'
  | 'blocked_onsite'
  | 'ended_visit'
  | 'work_complete'
  | 'closeout_completed'
  | 'reopened';

export interface JobLifecycleEvent {
  id: string;
  type: LifecycleEventType;
  timestamp: string;
  visitId?: string;
  note?: string;
}

export interface JobVisit {
  id: string;
  visitNumber: number;
  arrivedAt: string;
  startedWorkAt?: string;
  endedAt?: string;
  endReason?: VisitEndReason;
  endReasonNote?: string;
}

export interface JobLifecycleState {
  schemaVersion: 1;
  category?: JobCategory;
  status: JobLifecycleStatus;
  workState: JobWorkState;
  activeVisitId?: string;
  visits: JobVisit[];
  events: JobLifecycleEvent[];
  originalCompletedAt?: string;
  completedAt?: string;
  reopenedAt?: string;
  reopenReason?: string;
}

export interface JobTimeSummary {
  arrivalToDepartureMinutes: number;
  activeWorkMinutes: number;
  pausedMinutes: number;
  awaitingSupportMinutes: number;
  blockedOnsiteMinutes: number;
  totalOnsiteMinutes: number;
}
