import { describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import {
  createDefaultLifecycleForJob,
  normalizeJobState,
  normalizeJobsForStorage,
} from '../src/features/jobs/jobState';
import type { JobLifecycleState } from '../src/features/jobs/jobLifecycleTypes';

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

describe('job lifecycle storage normalization', () => {
  it('adds a default lifecycle to a legacy job with no lifecycle state', () => {
    const normalized = normalizeJobState(makeJob());

    expect(normalized.lifecycle).toEqual({
      schemaVersion: 1,
      status: 'ready',
      workState: 'offsite',
      visits: [],
      events: [],
    });
    expect(normalized.status).toBe('ready');
  });

  it('preserves an existing valid lifecycle state', () => {
    const lifecycle: JobLifecycleState = {
      schemaVersion: 1,
      status: 'in_progress',
      workState: 'working',
      activeVisitId: 'visit-1',
      visits: [{
        id: 'visit-1',
        visitNumber: 1,
        arrivedAt: '2026-08-14T09:00:00.000Z',
        startedWorkAt: '2026-08-14T09:05:00.000Z',
      }],
      events: [{
        id: 'event-1',
        type: 'started_work',
        timestamp: '2026-08-14T09:05:00.000Z',
        visitId: 'visit-1',
      }],
    };

    const normalized = normalizeJobState(makeJob({ lifecycle }));

    expect(normalized.lifecycle).toBe(lifecycle);
    expect(normalized.status).toBe('ready');
  });

  it('is idempotent across repeated normalization', () => {
    const once = normalizeJobsForStorage([makeJob()]);
    const twice = normalizeJobsForStorage(once);

    expect(twice).toEqual(once);
  });

  it('maps a completed legacy job into completed lifecycle state', () => {
    const normalized = normalizeJobState(makeJob({
      status: 'completed',
      isCompleted: true,
    }));

    expect(normalized.isCompleted).toBe(true);
    expect(normalized.lifecycle).toMatchObject({
      schemaVersion: 1,
      status: 'completed',
      workState: 'offsite',
      visits: [],
      events: [],
    });
  });

  it('creates the same default lifecycle helper shape used by normalization', () => {
    expect(createDefaultLifecycleForJob(makeJob({ status: 'postponed' }))).toEqual({
      schemaVersion: 1,
      status: 'planned',
      workState: 'not_started',
      visits: [],
      events: [],
    });
  });
});
