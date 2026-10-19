import type { Job } from '../../types';
import type { JobCloseoutRequirement } from './jobCloseoutTypes';

export const JOB_LIFECYCLE_HARNESS_JOB_ID = 'dev-lifecycle-harness-job';

export interface LifecycleHarnessEnv {
  DEV?: boolean;
  VITE_ENABLE_JOB_LIFECYCLE_HARNESS?: string;
}

export function isJobLifecycleHarnessEnabled(env: LifecycleHarnessEnv): boolean {
  return env.DEV === true && env.VITE_ENABLE_JOB_LIFECYCLE_HARNESS === 'true';
}

export function createLifecycleHarnessCloseoutRequirements(satisfied = false): JobCloseoutRequirement[] {
  return [
    {
      id: 'harness-proof-photo',
      kind: 'required',
      label: 'Fake proof photo attached',
      description: 'Harness blocker: pretend a required completion photo has been captured.',
      satisfied,
    },
    {
      id: 'harness-serial',
      kind: 'required',
      label: 'Fake serial / equipment ID recorded',
      description: 'Harness blocker: pretend the required equipment or serial number is recorded.',
      satisfied,
    },
    {
      id: 'harness-extra-note',
      kind: 'recommended',
      label: 'Optional fake closeout note',
      description: 'Recommended only; this should never block final closeout.',
      satisfied: false,
    },
  ];
}

export function createLifecycleHarnessJob(today: string): Job {
  return {
    id: JOB_LIFECYCLE_HARNESS_JOB_ID,
    storeName: 'Lifecycle Harness Test Job',
    address: '1951 Golden State Ave, Bakersfield, CA',
    pay: 66.70,
    estimatedMinutes: 20,
    jobType: 'field_task',
    dueTime: '23:59',
    notes: 'Development-only fake technician job for lifecycle acceptance testing. Enable with VITE_ENABLE_JOB_LIFECYCLE_HARNESS=true.',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3801, lng: -119.0126 },
    priority: 'high',
    scheduledDate: today,
    lifecycle: {
      schemaVersion: 1,
      status: 'planned',
      workState: 'not_started',
      visits: [],
      events: [],
    },
    closeoutRequirements: createLifecycleHarnessCloseoutRequirements(false),
  };
}

export function includesLifecycleHarnessJob(jobs: Job[]): boolean {
  return jobs.some(job => job.id === JOB_LIFECYCLE_HARNESS_JOB_ID);
}

export function ensureLifecycleHarnessJob(jobs: Job[], enabled: boolean, today: string): Job[] {
  if (!enabled) return jobs.filter(job => job.id !== JOB_LIFECYCLE_HARNESS_JOB_ID);
  return includesLifecycleHarnessJob(jobs) ? jobs : [createLifecycleHarnessJob(today), ...jobs];
}

export function resetLifecycleHarnessJob(jobs: Job[], today: string): Job[] {
  return [createLifecycleHarnessJob(today), ...jobs.filter(job => job.id !== JOB_LIFECYCLE_HARNESS_JOB_ID)];
}

export function satisfyLifecycleHarnessCloseoutRequirements(jobs: Job[]): Job[] {
  return jobs.map(job =>
    job.id === JOB_LIFECYCLE_HARNESS_JOB_ID
      ? { ...job, closeoutRequirements: createLifecycleHarnessCloseoutRequirements(true) }
      : job,
  );
}
