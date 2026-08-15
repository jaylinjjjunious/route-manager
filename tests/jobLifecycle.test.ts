import { describe, expect, it } from 'vitest';
import {
  arriveAtJob,
  blockBeforeStart,
  completeJobCloseout,
  createJobLifecycle,
  endJobVisit,
  markJobWorkComplete,
  markReadyToStart,
  reopenCompletedJob,
  setJobWorkState,
  startJobWork,
  summarizeJobTime,
} from '../src/features/jobs/jobLifecycle';

describe('job lifecycle', () => {
  it('supports arrival, start, interruption, end visit, and return visit', () => {
    let state = createJobLifecycle();

    state = arriveAtJob(state, '2026-08-14T09:00:00.000Z');
    expect(state.status).toBe('arrived');
    expect(state.visits).toHaveLength(1);

    state = markReadyToStart(state, '2026-08-14T09:05:00.000Z');
    state = startJobWork(state, '2026-08-14T09:10:00.000Z');
    expect(state.status).toBe('in_progress');
    expect(state.workState).toBe('working');

    state = setJobWorkState(state, 'awaiting_support', 'Waiting for Verifone', '2026-08-14T09:30:00.000Z');
    state = setJobWorkState(state, 'working', undefined, '2026-08-14T09:45:00.000Z');
    state = endJobVisit(state, 'missing_part', 'Return with replacement cable', '2026-08-14T10:00:00.000Z');

    expect(state.activeVisitId).toBeUndefined();
    expect(state.status).toBe('ready');
    expect(state.workState).toBe('offsite');

    state = arriveAtJob(state, '2026-08-14T13:00:00.000Z');
    expect(state.visits).toHaveLength(2);
    expect(state.visits[1].visitNumber).toBe(2);
  });

  it('tracks blocked before start without marking work in progress', () => {
    let state = createJobLifecycle();
    state = arriveAtJob(state, '2026-08-14T09:00:00.000Z');
    state = blockBeforeStart(state, 'Manager unavailable', '2026-08-14T09:03:00.000Z');

    expect(state.status).toBe('arrived');
    expect(state.workState).toBe('blocked_before_start');
    expect(state.events.at(-1)?.note).toBe('Manager unavailable');
  });

  it('keeps work complete separate from closeout completion and can reopen', () => {
    let state = createJobLifecycle();
    state = arriveAtJob(state, '2026-08-14T09:00:00.000Z');
    state = startJobWork(state, '2026-08-14T09:05:00.000Z');
    state = markJobWorkComplete(state, '2026-08-14T10:00:00.000Z');

    expect(state.status).toBe('work_complete_pending_closeout');

    state = completeJobCloseout(state, '2026-08-14T10:10:00.000Z');
    expect(state.status).toBe('completed');
    expect(state.originalCompletedAt).toBe('2026-08-14T10:10:00.000Z');

    state = reopenCompletedJob(state, 'Missing return receipt', '2026-08-14T11:00:00.000Z');
    expect(state.status).toBe('ready');
    expect(state.originalCompletedAt).toBe('2026-08-14T10:10:00.000Z');
    expect(state.reopenReason).toBe('Missing return receipt');
  });

  it('summarizes active, support, and onsite time', () => {
    let state = createJobLifecycle();
    state = arriveAtJob(state, '2026-08-14T09:00:00.000Z');
    state = startJobWork(state, '2026-08-14T09:10:00.000Z');
    state = setJobWorkState(state, 'awaiting_support', undefined, '2026-08-14T09:30:00.000Z');
    state = setJobWorkState(state, 'working', undefined, '2026-08-14T09:45:00.000Z');
    state = endJobVisit(state, 'completed_work', undefined, '2026-08-14T10:00:00.000Z');

    const summary = summarizeJobTime(state, '2026-08-14T10:00:00.000Z');
    expect(summary.totalOnsiteMinutes).toBe(60);
    expect(summary.activeWorkMinutes).toBe(35);
    expect(summary.awaitingSupportMinutes).toBe(15);
  });
});
