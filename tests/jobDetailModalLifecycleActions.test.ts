// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JobDetailModal from '../src/features/jobs/JobDetailModal';
import type { Job } from '../src/types';
import type { JobLifecycleState, VisitEndReason } from '../src/features/jobs/jobLifecycleTypes';
import type { JobLifecycleMutationResult } from '../src/features/jobs/types';

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

let container: HTMLDivElement;
let root: Root;

function lifecycle(overrides: Partial<JobLifecycleState> = {}): JobLifecycleState {
  return {
    schemaVersion: 1,
    status: 'planned',
    workState: 'not_started',
    visits: [],
    events: [],
    ...overrides,
  };
}

function activeLifecycle(overrides: Partial<JobLifecycleState> = {}): JobLifecycleState {
  return lifecycle({
    status: 'in_progress',
    workState: 'working',
    activeVisitId: 'visit-1',
    visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
    events: [{ id: 'event-1', type: 'arrived', timestamp: '2026-08-15T09:00:00.000Z', visitId: 'visit-1' }],
    ...overrides,
  });
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Vons',
    address: '5201 White Ln, Bakersfield, CA',
    pay: 25,
    estimatedMinutes: 30,
    jobType: 'retail_audit',
    dueTime: '17:00',
    notes: '',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3733, lng: -119.0187 },
    ...overrides,
  };
}

const mutationResult: JobLifecycleMutationResult = {
  previousJob: makeJob(),
  updatedJob: makeJob(),
  nextJobs: [makeJob()],
  becameCompleted: false,
  becameFinished: false,
  lifecycleChanged: true,
  transitionBlocked: false,
};

function propsFor(job: Job, overrides: Partial<React.ComponentProps<typeof JobDetailModal>> = {}): React.ComponentProps<typeof JobDetailModal> {
  return {
    job,
    routeIndex: null,
    legDistance: 0,
    rideMinutes: 0,
    navLink: 'https://www.google.com/maps',
    isOutlier: false,
    jobAccessLocked: false,
    onToggleComplete: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onToggleRoute: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

async function renderModal(props: React.ComponentProps<typeof JobDetailModal>) {
  await act(async () => {
    root.render(React.createElement(JobDetailModal, props));
    await Promise.resolve();
  });
}

async function clickButton(name: string) {
  const buttons = Array.from(document.querySelectorAll('button'));
  const button = buttons.find(candidate => candidate.textContent?.trim() === name);
  expect(button, `button ${name}`).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

async function typeNote(value: string) {
  const textarea = document.querySelector<HTMLTextAreaElement>('[data-lifecycle-note="true"]');
  expect(textarea).toBeTruthy();
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    valueSetter?.call(textarea, value);
    textarea!.value = value;
    textarea!.defaultValue = value;
    textarea!.textContent = value;
    textarea!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    textarea!.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe('JobDetailModal lifecycle action wiring', () => {
  it('maps Flow A visible actions to check in, ready to start, and start callbacks', async () => {
    const onCheckInJob = vi.fn(() => mutationResult);
    const onMarkJobReadyToStart = vi.fn(() => mutationResult);
    const onStartJob = vi.fn(() => mutationResult);

    await renderModal(propsFor(makeJob({ lifecycle: lifecycle({ status: 'planned' }) }), { onCheckInJob }));
    expect(document.body.textContent).toContain('Current work state: Not Started');
    await clickButton('Arrive / Check In');
    expect(onCheckInJob).toHaveBeenCalledWith('job-1');

    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'arrived',
        workState: 'not_started',
        activeVisitId: 'visit-1',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
      }),
    }), { onMarkJobReadyToStart }));
    await clickButton('Ready to Start');
    expect(onMarkJobReadyToStart).toHaveBeenCalledWith('job-1');

    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'ready',
        workState: 'ready_to_start',
        activeVisitId: 'visit-1',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
      }),
    }), { onStartJob }));
    await clickButton('Start Job');
    expect(onStartJob).toHaveBeenCalledWith('job-1');
  });

  it('captures a required blocked-before-start reason before calling the callback', async () => {
    const onBlockJobBeforeStart = vi.fn(() => mutationResult);
    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'arrived',
        workState: 'not_started',
        activeVisitId: 'visit-1',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
      }),
    }), { onBlockJobBeforeStart }));

    await clickButton('Blocked Before Start');
    expect(document.body.textContent).toContain('Why is work blocked before start?');

    await clickButton('Save');
    expect(onBlockJobBeforeStart).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Add a short reason before saving.');

    await typeNote('Manager unavailable');
    await clickButton('Save');
    expect(onBlockJobBeforeStart).toHaveBeenCalledWith('job-1', 'Manager unavailable');
  });

  it('maps pause/resume and support flows without changing completion status', async () => {
    const onPauseJobWork = vi.fn(() => mutationResult);
    const onResumeJobWork = vi.fn(() => mutationResult);
    const onAwaitJobSupport = vi.fn(() => mutationResult);

    await renderModal(propsFor(makeJob({ lifecycle: activeLifecycle() }), { onPauseJobWork, onAwaitJobSupport }));
    expect(document.body.textContent).toContain('Current work state: Working');
    await clickButton('Pause Work');
    await clickButton('Save');
    expect(onPauseJobWork).toHaveBeenCalledWith('job-1', undefined);

    await clickButton('Await Support');
    await typeNote('Waiting for district approval');
    await clickButton('Save');
    expect(onAwaitJobSupport).toHaveBeenCalledWith('job-1', 'Waiting for district approval');

    await renderModal(propsFor(makeJob({
      lifecycle: activeLifecycle({ workState: 'awaiting_support' }),
    }), { onResumeJobWork }));
    expect(document.body.textContent).toContain('Current work state: Awaiting Support');
    await clickButton('Resume Work');
    expect(onResumeJobWork).toHaveBeenCalledWith('job-1');
  });

  it('maps blocked onsite to reason capture and supports resume or end visit', async () => {
    const onMarkJobBlockedOnsite = vi.fn(() => mutationResult);
    const onResumeJobWork = vi.fn(() => mutationResult);
    const onEndJobVisit = vi.fn(() => mutationResult);

    await renderModal(propsFor(makeJob({ lifecycle: activeLifecycle() }), { onMarkJobBlockedOnsite }));
    await clickButton('Blocked Onsite');
    await typeNote('Locked case');
    await clickButton('Save');
    expect(onMarkJobBlockedOnsite).toHaveBeenCalledWith('job-1', 'Locked case');

    await renderModal(propsFor(makeJob({
      lifecycle: activeLifecycle({ workState: 'blocked_onsite' }),
    }), { onResumeJobWork, onEndJobVisit }));
    expect(document.body.textContent).toContain('Current work state: Blocked Onsite');
    await clickButton('Resume Work');
    expect(onResumeJobWork).toHaveBeenCalledWith('job-1');

    await clickButton('End Visit');
    await typeNote('Need manager unlock');
    const select = document.querySelector('select');
    expect(select).toBeTruthy();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    await act(async () => {
      valueSetter?.call(select, 'access_denied' satisfies VisitEndReason);
      select!.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    await clickButton('Save');
    expect(onEndJobVisit).toHaveBeenCalledWith('job-1', 'access_denied', 'Need manager unlock');
  });

  it('maps Work Complete and shows pending closeout without active-work controls', async () => {
    const onMarkJobWorkComplete = vi.fn(() => mutationResult);

    await renderModal(propsFor(makeJob({ lifecycle: activeLifecycle() }), { onMarkJobWorkComplete }));
    expect(document.body.textContent).toContain('Work Complete');
    await clickButton('Work Complete');
    expect(onMarkJobWorkComplete).toHaveBeenCalledWith('job-1');

    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'work_complete_pending_closeout',
        workState: 'offsite',
        visits: [
          {
            id: 'visit-1',
            visitNumber: 1,
            arrivedAt: '2026-08-15T09:00:00.000Z',
            startedWorkAt: '2026-08-15T09:10:00.000Z',
            endedAt: '2026-08-15T10:00:00.000Z',
            endReason: 'completed_work',
          },
        ],
      }),
    })));

    expect(document.body.textContent).toContain('Work Complete — Pending Closeout');
    expect(document.body.textContent).toContain('Current work state: Offsite');
    expect(document.body.textContent).toContain('Closeout');
    expect(document.body.textContent).not.toContain('Pause Work');
    expect(document.body.textContent).not.toContain('Resume Work');
    expect(document.body.textContent).not.toContain('Await Support');
    expect(document.body.textContent).not.toContain('Blocked Onsite');
    expect(document.body.textContent).not.toContain('End Visit');
  });

  it('blocks final closeout when required items are missing but not for recommended or reference items', async () => {
    const onCompleteJobCloseout = vi.fn(() => mutationResult);
    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'work_complete_pending_closeout',
        workState: 'offsite',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z', endedAt: '2026-08-15T10:00:00.000Z' }],
      }),
      closeoutRequirements: [
        { id: 'proof', kind: 'required', label: 'Upload required proof', satisfied: false },
        { id: 'receipt', kind: 'recommended', label: 'Attach receipt', satisfied: false },
        { id: 'policy', kind: 'reference', label: 'Review program notes' },
      ],
    }), { onCompleteJobCloseout }));

    expect(document.body.textContent).toContain('Closeout');
    expect(document.body.textContent).toContain('1 required item missing.');
    expect(document.body.textContent).toContain('Upload required proof');
    expect(document.body.textContent).toContain('Attach receipt');
    expect(document.body.textContent).toContain('Review program notes');
    const completeButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === 'Complete Job');
    expect(completeButton).toBeTruthy();
    expect(completeButton?.disabled).toBe(true);
    expect(onCompleteJobCloseout).not.toHaveBeenCalled();
  });

  it('allows final closeout when required items are satisfied and preserves lifecycle completion through the action', async () => {
    const onCompleteJobCloseout = vi.fn(() => ({
      ...mutationResult,
      updatedJob: makeJob({
        lifecycle: lifecycle({
          status: 'completed',
          workState: 'offsite',
          completedAt: '2026-08-15T10:10:00.000Z',
          originalCompletedAt: '2026-08-15T10:10:00.000Z',
        }),
      }),
    }));

    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'work_complete_pending_closeout',
        workState: 'offsite',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z', endedAt: '2026-08-15T10:00:00.000Z' }],
      }),
      closeoutRequirements: [
        { id: 'proof', kind: 'required', label: 'Upload required proof', satisfied: true },
        { id: 'receipt', kind: 'recommended', label: 'Attach receipt', satisfied: false },
      ],
    }), { onCompleteJobCloseout }));

    expect(document.body.textContent).toContain('Ready for final completion.');
    await clickButton('Complete Job');
    expect(onCompleteJobCloseout).toHaveBeenCalledWith('job-1');
    expect(onCompleteJobCloseout.mock.results[0].value.updatedJob.lifecycle.completedAt).toBe('2026-08-15T10:10:00.000Z');
  });

  it('shows compact visit history with visit numbers, timing, reasons, and visit ids', async () => {
    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'arrived',
        workState: 'not_started',
        activeVisitId: 'visit-2',
        visits: [
          {
            id: 'visit-1',
            visitNumber: 1,
            arrivedAt: '2026-08-15T09:00:00.000Z',
            startedWorkAt: '2026-08-15T09:10:00.000Z',
            endedAt: '2026-08-15T10:05:00.000Z',
            endReason: 'missing_part',
          },
          {
            id: 'visit-2',
            visitNumber: 2,
            arrivedAt: '2026-08-15T13:00:00.000Z',
          },
        ],
      }),
    })));

    expect(document.body.textContent).toContain('Visit History');
    expect(document.body.textContent).toContain('Onsite now');
    expect(document.body.textContent).toContain('Visit 1');
    expect(document.body.textContent).toContain('Visit 2');
    expect(document.body.textContent).toContain('missing part');
    expect(document.body.textContent).toContain('Started: Aug 15');
    expect(document.querySelector('[data-visit-id="visit-1"]')).not.toBeNull();
    expect(document.querySelector('[data-visit-id="visit-2"]')).not.toBeNull();
  });

  it('shows compact lifecycle time summary and hides zero secondary buckets', async () => {
    await renderModal(propsFor(makeJob({
      lifecycle: lifecycle({
        status: 'ready',
        workState: 'offsite',
        visits: [
          {
            id: 'visit-1',
            visitNumber: 1,
            arrivedAt: '2026-08-15T09:00:00.000Z',
            startedWorkAt: '2026-08-15T09:10:00.000Z',
            endedAt: '2026-08-15T10:00:00.000Z',
            endReason: 'completed_work',
          },
        ],
        events: [
          { id: 'event-1', type: 'arrived', timestamp: '2026-08-15T09:00:00.000Z', visitId: 'visit-1' },
          { id: 'event-2', type: 'started_work', timestamp: '2026-08-15T09:10:00.000Z', visitId: 'visit-1' },
          { id: 'event-3', type: 'paused', timestamp: '2026-08-15T09:20:00.000Z', visitId: 'visit-1' },
          { id: 'event-4', type: 'resumed_work', timestamp: '2026-08-15T09:30:00.000Z', visitId: 'visit-1' },
          { id: 'event-5', type: 'awaiting_support', timestamp: '2026-08-15T09:40:00.000Z', visitId: 'visit-1' },
          { id: 'event-6', type: 'resumed_work', timestamp: '2026-08-15T09:50:00.000Z', visitId: 'visit-1' },
          { id: 'event-7', type: 'ended_visit', timestamp: '2026-08-15T10:00:00.000Z', visitId: 'visit-1' },
        ],
      }),
    })));

    const summary = document.querySelector('[aria-label="Lifecycle time summary"]');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('Time Summary');
    expect(summary?.textContent).toContain('Recorded');
    expect(summary?.textContent).toContain('Onsite');
    expect(summary?.textContent).toContain('1h');
    expect(summary?.textContent).toContain('Active Work');
    expect(summary?.textContent).toContain('30m');
    expect(summary?.textContent).toContain('Paused');
    expect(summary?.textContent).toContain('Support');
    expect(summary?.textContent).not.toContain('Blocked');
  });
});
