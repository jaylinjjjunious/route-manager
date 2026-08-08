/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Job scheduling helpers.
 *
 * All scheduling is based on a local calendar day (YYYY-MM-DD) in
 * America/Los_Angeles. Dates are never round-tripped through
 * `new Date('YYYY-MM-DD')` (that parses as UTC and shifts the local day);
 * instead a local-noon `Date` is used for math and `Intl.DateTimeFormat`
 * produces the local day string.
 */

import { Job } from '../../types';

export const PLANNING_TIMEZONE = 'America/Los_Angeles';
export const SCHEDULE_MAX_DAYS_AHEAD = 365;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats a Date as YYYY-MM-DD in the given IANA time zone (defaults to the
 * planning time zone). The output represents the local calendar day, not the
 * UTC day.
 */
export function toLocalDateString(date: Date, timeZone = PLANNING_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  return `${values.year}-${values.month}-${values.day}`;
}

/** Today's local calendar date in America/Los_Angeles as YYYY-MM-DD. */
export function todayString(timeZone = PLANNING_TIMEZONE): string {
  return toLocalDateString(new Date(), timeZone);
}

/**
 * Validates a YYYY-MM-DD string against the real calendar (including leap
 * days). Anything else is rejected and must surface as Needs Review — it is
 * never silently coerced to another date.
 */
export function isValidScheduledDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Adds `days` (positive or negative) to a YYYY-MM-DD local date string. */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

/** Formats a YYYY-MM-DD string for display, e.g. "Thu, Jul 30". */
export function formatScheduledDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day, 12, 0, 0));
}

export function isJobCompletedStatus(job: Pick<Job, 'status' | 'isCompleted'>): boolean {
  return job.status === 'completed' || job.isCompleted === true;
}

export function isJobFinishedStatus(job: Pick<Job, 'status'>): boolean {
  return job.status === 'finished';
}

/**
 * A job is actionable when it is a schedulable piece of today's route work:
 * ready, revisit, or outlier. Completed, finished, under-review, and
 * postponed jobs are intentionally excluded from the actionable pool.
 */
export function isActionableJob(job: Pick<Job, 'status'>): boolean {
  return job.status === 'ready' || job.status === 'revisit' || job.status === 'outlier';
}

export function hasInvalidCoordinates(job: Job): boolean {
  if (!job.coordinates) return true;
  return (
    Number.isNaN(job.coordinates.lat) ||
    Number.isNaN(job.coordinates.lng) ||
    (job.coordinates.lat === 0 && job.coordinates.lng === 0)
  );
}

/**
 * The effective workday for a job, or null when it is not pinned to a day.
 *
 * - A valid scheduledDate always wins.
 * - An invalid scheduledDate is never coerced; it returns null so it can be
 *   surfaced as Needs Review.
 * - A legacy undated Route A job that is actionable or under review is
 *   treated as today (derived only — never persisted, so it does not pin
 *   yesterday's date and drop off the route tomorrow).
 * - Undated Route B / postponed / inactive jobs have no effective day and
 *   surface through the unscheduled review list instead.
 */
export function effectiveDay(job: Job, today: string): string | null {
  if (job.scheduledDate != null) {
    return isValidScheduledDate(job.scheduledDate) ? job.scheduledDate : null;
  }
  if (job.routeId === 'A' && (isActionableJob(job) || job.status === 'under_review')) return today;
  return null;
}

export interface ScheduleMigrationResult {
  jobs: Job[];
  migratedCount: number;
  changed: boolean;
}

/**
 * One-time migration of the legacy `jobs_moved_to_tomorrow` list into
 * per-job scheduledDate values. Jobs with a valid scheduledDate are preserved
 * untouched; legacy moved jobs get tomorrow's local date and Route B (Option
 * A: future work lives on standby). Completed/finished/under-review jobs are
 * never rewritten. Returns the same array reference when nothing changed so
 * callers can skip storage rewrites.
 */
export function migrateScheduledDates(
  jobs: Job[],
  movedToTomorrowIds: string[],
  today: string,
): ScheduleMigrationResult {
  let changed = false;
  let migratedCount = 0;
  const next = jobs.map((job) => {
    if (job.scheduledDate != null) return job;
    if (
      movedToTomorrowIds.includes(job.id) &&
      !isJobCompletedStatus(job) &&
      !isJobFinishedStatus(job) &&
      job.status !== 'under_review'
    ) {
      changed = true;
      migratedCount += 1;
      return { ...job, scheduledDate: addDays(today, 1), routeId: 'B' as const };
    }
    return job;
  });
  return { jobs: changed ? next : jobs, migratedCount, changed };
}

/** Builds `days` local dates starting today. */
export function buildWeeklyDays(today: string, days = 7): string[] {
  return Array.from({ length: days }, (_, index) => addDays(today, index));
}

export interface ScheduledDaySummary {
  date: string;
  jobs: Job[];
  pay: number;
  workMinutes: number;
  reviewJobs: Job[];
}

/** Groups jobs into the next `days` local calendar days starting today. */
export function groupJobsByDay(jobs: Job[], today: string, days = 7): ScheduledDaySummary[] {
  return buildWeeklyDays(today, days).map((date) => {
    const dayJobs = jobs.filter((job) => effectiveDay(job, today) === date);
    return {
      date,
      jobs: dayJobs,
      pay: dayJobs.reduce((sum, job) => sum + (Number(job.pay) || 0), 0),
      workMinutes: dayJobs.reduce((sum, job) => sum + (Number(job.estimatedMinutes) || 0), 0),
      reviewJobs: dayJobs.filter((job) => schedulingNeedsReview(job)),
    };
  });
}

/** An active job pinned to a past date. Never auto-moved; surfaced for review. */
export function isOverdue(job: Job, today: string): boolean {
  return (
    job.scheduledDate != null &&
    isValidScheduledDate(job.scheduledDate) &&
    job.scheduledDate < today &&
    (isActionableJob(job) || job.status === 'under_review')
  );
}

export type ReviewKind =
  | 'invalid_date'
  | 'missing_address'
  | 'missing_deadline'
  | 'missing_duration'
  | 'invalid_coordinates';

export interface JobReviewIssue {
  kind: ReviewKind;
  message: string;
}

/** Scheduling + planning problems that make a job's day slot unreliable. */
export function planningIssues(job: Job): JobReviewIssue[] {
  const issues: JobReviewIssue[] = [];
  if (job.scheduledDate != null && !isValidScheduledDate(job.scheduledDate)) {
    issues.push({ kind: 'invalid_date', message: 'Invalid scheduled date.' });
  }
  if (!job.address || !job.address.trim()) {
    issues.push({ kind: 'missing_address', message: 'Address is missing.' });
  }
  if (!job.deadline && !job.dueTime) {
    issues.push({ kind: 'missing_deadline', message: 'No deadline or due time set.' });
  }
  if (!job.estimatedMinutes || job.estimatedMinutes <= 0) {
    issues.push({ kind: 'missing_duration', message: 'Expected visit duration is missing.' });
  }
  if (hasInvalidCoordinates(job)) {
    issues.push({ kind: 'invalid_coordinates', message: 'Location could not be resolved.' });
  }
  return issues;
}

export function schedulingNeedsReview(job: Job): boolean {
  return planningIssues(job).length > 0;
}
