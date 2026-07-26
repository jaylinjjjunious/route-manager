import { Job, JobStatus, StatusEvent } from '../types';

export const JOB_STATE_SCHEMA_VERSION = '3';

const VALID_JOB_STATUSES: JobStatus[] = ['ready', 'revisit', 'under_review', 'completed', 'pending', 'postponed', 'outlier', 'finished'];

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

export function normalizeJobState(job: Job): Job {
  const status = normalizeJobStatus(job.status);

  if (status === 'finished') {
    return {
      ...job,
      status: 'finished',
      isCompleted: true,
      isRevisionRequired: false,
    };
  }

  if (status === 'completed' || job.isCompleted === true) {
    return {
      ...job,
      status: 'completed',
      isCompleted: true,
      isRevisionRequired: false
    };
  }

  if (status === 'revisit' || job.isRevisionRequired === true) {
    return {
      ...job,
      status: 'revisit',
      isCompleted: false,
      isRevisionRequired: true
    };
  }

  return {
    ...job,
    status,
    routeId: job.routeId === 'B' ? 'B' : 'A',
    isCompleted: false,
    isRevisionRequired: false
  };
}

export function normalizeJobsForStorage(jobs: Job[]): Job[] {
  return jobs.map(normalizeJobState);
}
