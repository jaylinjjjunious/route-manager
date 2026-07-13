import { Job, JobStatus } from '../types';

export const JOB_STATE_SCHEMA_VERSION = '2';

const VALID_JOB_STATUSES: JobStatus[] = ['ready', 'revisit', 'completed', 'pending', 'postponed', 'outlier'];

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

export function isRevisionJob(job: Pick<Job, 'status' | 'isRevisionRequired'>): boolean {
  return job.status === 'revisit' || job.isRevisionRequired === true;
}

export function normalizeJobState(job: Job): Job {
  const status = normalizeJobStatus(job.status);

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
