import { describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import { buildJobOverview } from '../src/features/jobs/jobOverview';
import type { JobLifecycleState } from '../src/features/jobs/jobLifecycleTypes';

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

describe('buildJobOverview', () => {
  it('derives check-in for planned or ready jobs', () => {
    expect(buildJobOverview(makeJob({ lifecycle: lifecycle({ status: 'planned' }) })).nextAction.primaryLabel).toBe('Arrive / Check In');
    expect(buildJobOverview(makeJob({ lifecycle: lifecycle({ status: 'ready', workState: 'offsite' }) })).nextAction.primaryLabel).toBe('Arrive / Check In');
  });

  it('derives ready/start work actions through arrival and ready-to-start states', () => {
    const arrived = lifecycle({
      status: 'arrived',
      workState: 'not_started',
      activeVisitId: 'visit-1',
      visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
    });
    expect(buildJobOverview(makeJob({ lifecycle: arrived })).nextAction).toMatchObject({
      primaryLabel: 'Ready to Start',
      secondaryLabels: ['Blocked Before Start', 'End Visit'],
    });

    const readyToStart = lifecycle({
      status: 'ready',
      workState: 'ready_to_start',
      activeVisitId: 'visit-1',
      visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
    });
    expect(buildJobOverview(makeJob({ lifecycle: readyToStart })).nextAction).toMatchObject({
      primaryLabel: 'Start Job',
      secondaryLabels: ['Blocked Before Start', 'End Visit'],
    });
  });

  it('derives operational choices for active work states', () => {
    const activeVisit = { id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' };

    expect(buildJobOverview(makeJob({
      lifecycle: lifecycle({ status: 'in_progress', workState: 'working', activeVisitId: 'visit-1', visits: [activeVisit] }),
    })).nextAction).toMatchObject({
      primaryLabel: 'Pause Work',
      secondaryLabels: ['Continue Procedure', 'Await Support', 'Blocked Onsite', 'Work Complete', 'End Visit'],
    });

    expect(buildJobOverview(makeJob({
      lifecycle: lifecycle({ status: 'in_progress', workState: 'awaiting_support', activeVisitId: 'visit-1', visits: [activeVisit] }),
    })).nextAction).toMatchObject({
      primaryLabel: 'Resume Work',
      secondaryLabels: ['Work Complete', 'End Visit'],
    });
  });

  it('derives closeout and reopen actions for completion states', () => {
    const pendingCloseout = buildJobOverview(makeJob({
      lifecycle: lifecycle({ status: 'work_complete_pending_closeout', workState: 'offsite' }),
    })).nextAction;
    expect(pendingCloseout).toMatchObject({
      title: 'Work Complete — Pending Closeout',
      primaryLabel: 'Closeout',
      secondaryLabels: [],
    });

    expect(buildJobOverview(makeJob({
      lifecycle: lifecycle({ status: 'completed', workState: 'offsite', completedAt: '2026-08-15T10:10:00.000Z' }),
    })).nextAction.primaryLabel).toBe('Reopen if necessary');
  });

  it('warns when procedure is assigned but no devices are selected', () => {
    const overview = buildJobOverview(makeJob({
      procedureAssignment: { procedureId: 'sonic-verifone-device-swap', procedureVersion: '1.0.0', assignmentSource: 'import_suggestion', assignedAt: '2026-08-15T09:00:00.000Z' },
      deviceTypes: [],
    }));
    expect(overview.warnings.map(w => w.label)).toContain('Procedure assigned but no devices selected.');
  });

  it('reports missing work and legacy lifecycle conflicts as warnings', () => {
    const overview = buildJobOverview(makeJob({
      address: '',
      dueTime: '',
      coordinates: undefined as never,
      status: 'ready',
      lifecycle: lifecycle({ status: 'completed', workState: 'offsite' }),
    }), { isOutlier: true, jobAccessLocked: true });

    expect(overview.warnings.map(warning => warning.label)).toEqual(expect.arrayContaining([
      'Shower verification required before completion actions.',
      'Missing address.',
      'Missing usable coordinates.',
      'Missing schedule or due time.',
      'Route outlier: review travel impact before committing.',
      'Lifecycle is completed while legacy status remains active.',
    ]));
  });
});
