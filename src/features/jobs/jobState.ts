import { Job, JobStatus, StatusEvent } from '../../types';
import { createJobLifecycle } from './jobLifecycle';
import type { JobLifecycleState } from './jobLifecycleTypes';
import { migrateScheduledDates, ScheduleMigrationResult, todayString } from './jobSchedule';

export const JOB_STATE_SCHEMA_VERSION = '5';

const VALID_JOB_STATUSES: JobStatus[] = ['ready', 'revisit', 'under_review', 'completed', 'pending', 'postponed', 'outlier', 'finished'];
const VALID_LIFECYCLE_STATUSES: JobLifecycleState['status'][] = [
  'planned',
  'ready',
  'arrived',
  'in_progress',
  'work_complete_pending_closeout',
  'completed',
  'cancelled',
];
const VALID_LIFECYCLE_WORK_STATES: JobLifecycleState['workState'][] = [
  'not_started',
  'ready_to_start',
  'working',
  'paused',
  'awaiting_support',
  'blocked_before_start',
  'blocked_onsite',
  'offsite',
];

export function normalizeJobStatus(status: unknown): JobStatus {
  if (status === 'pending') return 'ready';
  if (typeof status === 'string' && VALID_JOB_STATUSES.includes(status as JobStatus)) {
    return status as JobStatus;
  }
  return 'ready';
}

export function isJobCompleted(job: Pick<Job, 'status' | 'isCompleted'>): boolean {
  return job.status === 'completed' || job.isCompleted === true;
}

export function isJobFinished(job: Pick<Job, 'status'>): boolean {
  return job.status === 'finished';
}

export function isJobActive(job: Pick<Job, 'status'>): boolean {
  return !isJobCompleted(job) && !isJobFinished(job);
}

export function isRevisionJob(job: Pick<Job, 'status' | 'isRevisionRequired'>): boolean {
  return job.status === 'revisit' || job.isRevisionRequired === true;
}

export function isUnderReview(job: Pick<Job, 'status'>): boolean {
  return job.status === 'under_review';
}

export function recordStatusTransition(job: Job, newStatus: JobStatus, note?: string): Job {
  const history = job.statusHistory ? [...job.statusHistory] : [];
  const event: StatusEvent = {
    timestamp: new Date().toISOString(),
    from: job.status,
    to: newStatus,
    note,
  };
  history.push(event);
  return { ...job, statusHistory: history };
}

function isValidJobLifecycleState(value: unknown): value is JobLifecycleState {
  if (!value || typeof value !== 'object') return false;
  const lifecycle = value as JobLifecycleState;
  return lifecycle.schemaVersion === 1
    && VALID_LIFECYCLE_STATUSES.includes(lifecycle.status)
    && VALID_LIFECYCLE_WORK_STATES.includes(lifecycle.workState)
    && Array.isArray(lifecycle.visits)
    && Array.isArray(lifecycle.events);
}

export function createDefaultLifecycleForJob(job: Pick<Job, 'status' | 'isCompleted'>): JobLifecycleState {
  const lifecycle = createJobLifecycle();
  const completionTime = (job as unknown as { completionTime?: unknown }).completionTime;
  const completedAt = typeof completionTime === 'string'
    ? completionTime
    : undefined;

  if (job.status === 'completed' || job.status === 'finished' || job.isCompleted === true) {
    return {
      ...lifecycle,
      status: 'completed',
      workState: 'offsite',
      completedAt,
      originalCompletedAt: completedAt,
    };
  }

  if (job.status === 'under_review') {
    return {
      ...lifecycle,
      status: 'work_complete_pending_closeout',
      workState: 'offsite',
    };
  }

  if (job.status === 'ready' || job.status === 'revisit' || job.status === 'outlier') {
    return {
      ...lifecycle,
      status: 'ready',
      workState: 'offsite',
    };
  }

  return lifecycle;
}

export function normalizeJobLifecycleState(job: Job): JobLifecycleState {
  if (isValidJobLifecycleState(job.lifecycle)) {
    return job.lifecycle;
  }
  return createDefaultLifecycleForJob(job);
}

export function normalizeJobState(job: Job): Job {
  const status = normalizeJobStatus(job.status);

  if (status === 'finished') {
    const normalized: Job = {
      ...job,
      status: 'finished',
      isCompleted: true,
      isRevisionRequired: false,
    };
    return { ...normalized, lifecycle: normalizeJobLifecycleState(normalized) };
  }

  if (status === 'completed' || job.isCompleted === true) {
    const normalized: Job = {
      ...job,
      status: 'completed',
      isCompleted: true,
      isRevisionRequired: false
    };
    return { ...normalized, lifecycle: normalizeJobLifecycleState(normalized) };
  }

  if (status === 'revisit' || job.isRevisionRequired === true) {
    const normalized: Job = {
      ...job,
      status: 'revisit',
      isCompleted: false,
      isRevisionRequired: true
    };
    return { ...normalized, lifecycle: normalizeJobLifecycleState(normalized) };
  }

  const normalized: Job = {
    ...job,
    status,
    routeId: job.routeId === 'B' ? 'B' : 'A',
    isCompleted: false,
    isRevisionRequired: false
  };
  return { ...normalized, lifecycle: normalizeJobLifecycleState(normalized) };
}

export function normalizeJobsForStorage(jobs: Job[]): Job[] {
  return jobs.map(normalizeJobState);
}

/**
 * Runs the one-time legacy `jobs_moved_to_tomorrow` migration (schema 3 → 4)
 * then normalizes. Idempotent: jobs that already carry a valid scheduledDate
 * are preserved, so re-running after a partial write is safe.
 */
export function migrateJobSchedules(
  jobs: Job[],
  movedToTomorrowIds: string[],
  today: string = todayString(),
): ScheduleMigrationResult & { jobs: Job[] } {
  const migrated = migrateScheduledDates(jobs, movedToTomorrowIds, today);
  return {
    jobs: normalizeJobsForStorage(migrated.jobs),
    migratedCount: migrated.migratedCount,
    changed: migrated.changed,
  };
}
