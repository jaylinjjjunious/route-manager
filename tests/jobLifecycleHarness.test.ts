import { describe, expect, it } from 'vitest';
import { SEED_JOBS } from '../src/features/jobs/useJobs';
import {
  JOB_LIFECYCLE_HARNESS_JOB_ID,
  createLifecycleHarnessJob,
  ensureLifecycleHarnessJob,
  isJobLifecycleHarnessEnabled,
  resetLifecycleHarnessJob,
  satisfyLifecycleHarnessCloseoutRequirements,
} from '../src/features/jobs/jobLifecycleHarness';

describe('job lifecycle acceptance harness', () => {
  it('requires both development mode and the explicit harness flag', () => {
    expect(isJobLifecycleHarnessEnabled({ DEV: true, VITE_ENABLE_JOB_LIFECYCLE_HARNESS: 'true' })).toBe(true);
    expect(isJobLifecycleHarnessEnabled({ DEV: false, VITE_ENABLE_JOB_LIFECYCLE_HARNESS: 'true' })).toBe(false);
    expect(isJobLifecycleHarnessEnabled({ DEV: true, VITE_ENABLE_JOB_LIFECYCLE_HARNESS: 'false' })).toBe(false);
    expect(isJobLifecycleHarnessEnabled({ DEV: true })).toBe(false);
  });

  it('does not live in normal seeded jobs', () => {
    expect(SEED_JOBS.some(job => job.id === JOB_LIFECYCLE_HARNESS_JOB_ID)).toBe(false);
  });

  it('does not leak when the harness is disabled and injects when enabled', () => {
    const harness = createLifecycleHarnessJob('2026-08-15');
    expect(ensureLifecycleHarnessJob([harness, ...SEED_JOBS], false, '2026-08-15').some(job => job.id === JOB_LIFECYCLE_HARNESS_JOB_ID)).toBe(false);

    const withHarness = ensureLifecycleHarnessJob(SEED_JOBS, true, '2026-08-15');
    expect(withHarness[0]).toMatchObject({
      id: JOB_LIFECYCLE_HARNESS_JOB_ID,
      storeName: 'Lifecycle Harness Test Job',
      status: 'ready',
      scheduledDate: '2026-08-15',
      lifecycle: { status: 'planned', workState: 'not_started' },
    });
  });

  it('resets the harness job and can satisfy fake closeout blockers', () => {
    const progressedHarness = {
      ...createLifecycleHarnessJob('2026-08-15'),
      lifecycle: {
        schemaVersion: 1 as const,
        status: 'completed' as const,
        workState: 'offsite' as const,
        visits: [],
        events: [],
        completedAt: '2026-08-15T10:00:00.000Z',
      },
    };

    const resetJobs = resetLifecycleHarnessJob([SEED_JOBS[0], progressedHarness], '2026-08-16');
    expect(resetJobs[0]).toMatchObject({
      id: JOB_LIFECYCLE_HARNESS_JOB_ID,
      scheduledDate: '2026-08-16',
      lifecycle: { status: 'planned', workState: 'not_started' },
    });
    expect(resetJobs).toHaveLength(2);

    const satisfied = satisfyLifecycleHarnessCloseoutRequirements(resetJobs);
    const harness = satisfied.find(job => job.id === JOB_LIFECYCLE_HARNESS_JOB_ID);
    expect(harness?.closeoutRequirements?.filter(item => item.kind === 'required').every(item => item.satisfied)).toBe(true);
    expect(harness?.closeoutRequirements?.find(item => item.kind === 'recommended')?.satisfied).toBe(false);
  });
});
