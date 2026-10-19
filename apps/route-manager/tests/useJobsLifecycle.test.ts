// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import { useJobs, type UseJobsReturn } from '../src/features/jobs/useJobs';
import type { JobLifecycleMutationResult } from '../src/features/jobs/types';

const TODAY = '2026-08-15';

let container: HTMLDivElement;
let root: Root;
let latest: UseJobsReturn | null = null;

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Family Dollar 2151 S Chester Ave',
    address: '2151 S Chester Ave, Bakersfield, CA',
    pay: 25,
    estimatedMinutes: 20,
    jobType: 'retail_audit',
    dueTime: '17:00',
    notes: '',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.32, lng: -119.02 },
    ...overrides,
  };
}

function Harness() {
  latest = useJobs(TODAY);
  return null;
}

async function renderHook() {
  await act(async () => {
    root.render(React.createElement(Harness));
    await Promise.resolve();
  });
}

function current(): UseJobsReturn {
  if (!latest) throw new Error('useJobs hook was not rendered');
  return latest;
}

async function seedJob(job: Job = makeJob()) {
  await act(async () => {
    current().replaceJobs([job]);
    await Promise.resolve();
  });
}

async function runLifecycleAction(action: () => JobLifecycleMutationResult): Promise<JobLifecycleMutationResult> {
  let result: JobLifecycleMutationResult | null = null;
  await act(async () => {
    result = action();
    await Promise.resolve();
  });
  if (!result) throw new Error('Lifecycle action did not return a result');
  return result;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  latest = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  latest = null;
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe('useJobs lifecycle actions', () => {
  it('exposes public lifecycle actions that persist transitions without changing legacy status', async () => {
    await renderHook();
    await seedJob();

    let result = await runLifecycleAction(() => current().checkInJob('job-1', '2026-08-15T09:00:00.000Z'));
    expect(result.lifecycleChanged).toBe(true);
    expect(result.transitionBlocked).toBe(false);
    expect(result.updatedJob?.status).toBe('ready');
    expect(result.updatedJob?.lifecycle?.status).toBe('arrived');
    expect(result.updatedJob?.lifecycle?.visits).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem('route_optimizer_jobs') || '[]')[0].lifecycle.status).toBe('arrived');

    result = await runLifecycleAction(() => current().markJobReadyToStart('job-1', '2026-08-15T09:05:00.000Z'));
    expect(result.updatedJob?.lifecycle?.status).toBe('ready');
    expect(result.updatedJob?.lifecycle?.workState).toBe('ready_to_start');

    result = await runLifecycleAction(() => current().startJob('job-1', '2026-08-15T09:10:00.000Z'));
    expect(result.updatedJob?.lifecycle?.status).toBe('in_progress');
    expect(result.updatedJob?.lifecycle?.workState).toBe('working');
    expect(result.updatedJob?.lifecycle?.visits[0].startedWorkAt).toBe('2026-08-15T09:10:00.000Z');

    result = await runLifecycleAction(() => current().pauseJobWork('job-1', 'Break', '2026-08-15T09:20:00.000Z'));
    expect(result.updatedJob?.lifecycle?.workState).toBe('paused');

    result = await runLifecycleAction(() => current().resumeJobWork('job-1', '2026-08-15T09:25:00.000Z'));
    expect(result.updatedJob?.lifecycle?.workState).toBe('working');

    result = await runLifecycleAction(() => current().awaitJobSupport('job-1', 'Waiting for manager', '2026-08-15T09:30:00.000Z'));
    expect(result.updatedJob?.lifecycle?.workState).toBe('awaiting_support');

    result = await runLifecycleAction(() => current().markJobBlockedOnsite('job-1', 'Locked case', '2026-08-15T09:35:00.000Z'));
    expect(result.updatedJob?.lifecycle?.workState).toBe('blocked_onsite');

    result = await runLifecycleAction(() => current().markJobWorkComplete('job-1', '2026-08-15T10:00:00.000Z'));
    expect(result.updatedJob?.status).toBe('ready');
    expect(result.becameCompleted).toBe(false);
    expect(result.updatedJob?.lifecycle?.status).toBe('work_complete_pending_closeout');
    expect(result.updatedJob?.lifecycle?.activeVisitId).toBeUndefined();
    expect(result.updatedJob?.lifecycle?.workState).toBe('offsite');
    expect(result.updatedJob?.lifecycle?.visits[0].endedAt).toBe('2026-08-15T10:00:00.000Z');
    expect(result.updatedJob?.lifecycle?.visits[0].endReason).toBe('completed_work');

    result = await runLifecycleAction(() => current().completeJobCloseout('job-1', '2026-08-15T10:10:00.000Z'));
    expect(result.updatedJob?.status).toBe('ready');
    expect(result.becameCompleted).toBe(false);
    expect(result.updatedJob?.lifecycle?.status).toBe('completed');
    expect(result.updatedJob?.lifecycle?.completedAt).toBe('2026-08-15T10:10:00.000Z');
    expect(result.updatedJob?.lifecycle?.originalCompletedAt).toBe('2026-08-15T10:10:00.000Z');

    result = await runLifecycleAction(() => current().reopenCompletedJob('job-1', 'Missing receipt', '2026-08-15T11:00:00.000Z'));
    expect(result.updatedJob?.lifecycle?.status).toBe('ready');
    expect(result.updatedJob?.lifecycle?.completedAt).toBeUndefined();
    expect(result.updatedJob?.lifecycle?.originalCompletedAt).toBe('2026-08-15T10:10:00.000Z');
    expect(result.updatedJob?.lifecycle?.reopenReason).toBe('Missing receipt');

    result = await runLifecycleAction(() => current().checkInJob('job-1', '2026-08-15T13:00:00.000Z'));
    expect(result.updatedJob?.lifecycle?.visits).toHaveLength(2);
    expect(result.updatedJob?.lifecycle?.visits[1].visitNumber).toBe(2);

    result = await runLifecycleAction(() => current().blockJobBeforeStart('job-1', 'Manager unavailable', '2026-08-15T13:05:00.000Z'));
    expect(result.updatedJob?.lifecycle?.status).toBe('arrived');
    expect(result.updatedJob?.lifecycle?.workState).toBe('blocked_before_start');

    result = await runLifecycleAction(() => current().endJobVisit('job-1', 'customer_not_ready', 'Return later', '2026-08-15T13:15:00.000Z'));
    expect(result.updatedJob?.lifecycle?.status).toBe('ready');
    expect(result.updatedJob?.lifecycle?.visits[1].endReason).toBe('customer_not_ready');

    const eventTypes = result.updatedJob?.lifecycle?.events.map(event => event.type);
    expect(eventTypes).toEqual([
      'arrived',
      'ready_to_start',
      'started_work',
      'paused',
      'resumed_work',
      'awaiting_support',
      'blocked_onsite',
      'work_complete',
      'closeout_completed',
      'reopened',
      'arrived',
      'blocked_before_start',
      'ended_visit',
    ]);
  });

  it('blocks invalid lifecycle transitions without persisting a new state', async () => {
    await renderHook();
    await seedJob();

    const before = window.localStorage.getItem('route_optimizer_jobs');
    const readyResult = await runLifecycleAction(() => current().markJobReadyToStart('job-1', '2026-08-15T09:05:00.000Z'));
    expect(readyResult.transitionBlocked).toBe(true);
    expect(readyResult.lifecycleChanged).toBe(false);
    expect(readyResult.updatedJob?.lifecycle?.events).toHaveLength(0);
    expect(window.localStorage.getItem('route_optimizer_jobs')).toBe(before);

    const closeoutResult = await runLifecycleAction(() => current().completeJobCloseout('job-1', '2026-08-15T10:10:00.000Z'));
    expect(closeoutResult.transitionBlocked).toBe(true);
    expect(closeoutResult.lifecycleChanged).toBe(false);

    const missingResult = await runLifecycleAction(() => current().checkInJob('missing-job', '2026-08-15T09:00:00.000Z'));
    expect(missingResult.previousJob).toBeNull();
    expect(missingResult.transitionBlocked).toBe(true);
  });
});
