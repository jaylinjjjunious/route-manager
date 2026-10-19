import { describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import { createJobLifecycle, startJobWork, arriveAtJob, completeJobCloseout, markJobWorkComplete } from '../src/features/jobs/jobLifecycle';
import { normalizeJobState } from '../src/features/jobs/jobState';
import {
  assignProcedureToJob,
  canChangeProcedureAssignment,
  changeProcedureAssignmentWithConfirmation,
  hasProcedureAssignment,
  isSameProcedureAssignment,
  removeProcedureFromJob,
} from '../src/features/jobs/procedures/jobProcedureAssignment';
import type { ProcedureDefinition } from '../src/features/jobs/procedures/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Vons',
    address: '5201 White Ln, Bakersfield, CA',
    pay: 25,
    estimatedMinutes: 30,
    jobType: 'field_task',
    dueTime: '17:00',
    notes: 'Preserve this note',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3733, lng: -119.0187 },
    captureMode: 'smart_aisle_scan',
    scanSessionId: 'scan-1',
    inventoryDomain: 'contract_parts',
    closeoutRequirements: [{ id: 'proof', kind: 'required', label: 'Proof', satisfied: false }],
    statusHistory: [{ timestamp: '2026-08-15T08:00:00.000Z', from: 'pending', to: 'ready', note: 'legacy' }],
    lifecycle: createJobLifecycle(),
    ...overrides,
  };
}

function makeProcedure(overrides: Partial<ProcedureDefinition> = {}): ProcedureDefinition {
  return {
    id: 'proc-generic',
    customerKey: 'generic',
    name: 'Generic Procedure',
    description: 'Generic field procedure',
    version: '1.0.0',
    status: 'active',
    category: 'technician',
    jobType: 'field_task',
    createdAt: '2026-08-15T08:00:00.000Z',
    updatedAt: '2026-08-15T08:00:00.000Z',
    steps: [
      {
        id: 'step-1',
        title: 'Do work',
        guidedInstructions: 'Do the work carefully.',
        quickCheckpoint: 'Do work',
        classification: 'required',
        displayOrder: 1,
      },
    ],
    ...overrides,
  };
}

const assignment = {
  procedureId: 'proc-generic',
  procedureVersion: '1.0.0',
  assignmentSource: 'manual' as const,
  assignedAt: '2026-08-15T09:00:00.000Z',
  assignedBy: 'tester',
  note: 'Initial assignment',
};

describe('job procedure assignment', () => {
  it('assigns a procedure before work starts', () => {
    const result = assignProcedureToJob(makeJob(), assignment, makeProcedure());

    expect(result.status).toBe('updated');
    expect(result.job.procedureAssignment).toMatchObject({
      procedureId: 'proc-generic',
      procedureVersion: '1.0.0',
      assignmentSource: 'manual',
      assignedAt: '2026-08-15T09:00:00.000Z',
    });
    expect(result.job.procedureAssignmentHistory).toHaveLength(1);
    expect(result.job.procedureAssignmentHistory?.[0]).toMatchObject({ action: 'assigned', confirmed: false });
    expect(hasProcedureAssignment(result.job)).toBe(true);
  });

  it('replaces a procedure before work starts', () => {
    const first = assignProcedureToJob(makeJob(), assignment).job;
    const result = assignProcedureToJob(first, {
      ...assignment,
      procedureId: 'proc-next',
      procedureVersion: '2.0.0',
      assignedAt: '2026-08-15T09:05:00.000Z',
    });

    expect(result.status).toBe('updated');
    expect(result.job.procedureAssignment?.procedureId).toBe('proc-next');
    expect(result.job.procedureAssignmentHistory?.at(-1)).toMatchObject({
      action: 'replaced',
      from: { procedureId: 'proc-generic', procedureVersion: '1.0.0' },
      to: { procedureId: 'proc-next', procedureVersion: '2.0.0' },
    });
  });

  it('removes a procedure before work starts', () => {
    const assigned = assignProcedureToJob(makeJob(), assignment).job;
    const result = removeProcedureFromJob(assigned, {
      assignmentSource: 'manual',
      assignedAt: '2026-08-15T09:10:00.000Z',
      note: 'Remove before work',
    });

    expect(result.status).toBe('removed');
    expect(result.job.procedureAssignment).toBeUndefined();
    expect(result.job.procedureAssignmentHistory?.at(-1)).toMatchObject({ action: 'removed', confirmed: false });
  });

  it('treats same-version reassignment as idempotent', () => {
    const assigned = assignProcedureToJob(makeJob(), assignment).job;
    const result = assignProcedureToJob(assigned, {
      ...assignment,
      assignedAt: '2026-08-15T09:30:00.000Z',
      note: 'No-op',
    });

    expect(result.status).toBe('unchanged');
    expect(result.job.procedureAssignmentHistory).toHaveLength(1);
    expect(isSameProcedureAssignment(result.job.procedureAssignment, { procedureId: 'proc-generic', procedureVersion: '1.0.0' })).toBe(true);
  });

  it('requires confirmation for active jobs', () => {
    let lifecycle = createJobLifecycle();
    lifecycle = arriveAtJob(lifecycle, '2026-08-15T09:00:00.000Z');
    lifecycle = startJobWork(lifecycle, '2026-08-15T09:05:00.000Z');
    const assignedBeforeWork = assignProcedureToJob(makeJob(), assignment).job;
    const assigned = { ...assignedBeforeWork, lifecycle };

    const result = assignProcedureToJob(assigned, { ...assignment, procedureVersion: '1.1.0' });

    expect(canChangeProcedureAssignment(assigned)).toMatchObject({ allowed: false, confirmationRequired: true, reason: 'work_started' });
    expect(result).toMatchObject({ status: 'confirmation_required', confirmationRequired: true, reason: 'work_started' });
    expect(result.job.procedureAssignment?.procedureVersion).toBe('1.0.0');
  });

  it('allows confirmed active changes and preserves lifecycle data', () => {
    let lifecycle = createJobLifecycle();
    lifecycle = arriveAtJob(lifecycle, '2026-08-15T09:00:00.000Z');
    lifecycle = startJobWork(lifecycle, '2026-08-15T09:05:00.000Z');
    const assignedBeforeWork = assignProcedureToJob(makeJob(), assignment).job;
    const assigned = { ...assignedBeforeWork, lifecycle };

    const result = changeProcedureAssignmentWithConfirmation(assigned, {
      ...assignment,
      procedureVersion: '1.1.0',
      assignedAt: '2026-08-15T09:20:00.000Z',
      note: 'Confirmed active update',
    });

    expect(result.status).toBe('updated');
    expect(result.job.lifecycle).toEqual(lifecycle);
    expect(result.job.procedureAssignment?.procedureVersion).toBe('1.1.0');
    expect(result.job.procedureAssignmentHistory?.at(-1)).toMatchObject({ action: 'replaced', confirmed: true });
  });

  it('preserves proof, closeout, inventory, notes, and revision-related fields', () => {
    const job = makeJob({ isRevisionRequired: true, revisionStatus: 'Needs Revision' });
    const result = assignProcedureToJob(job, assignment);

    expect(result.job.notes).toBe(job.notes);
    expect(result.job.captureMode).toBe('smart_aisle_scan');
    expect(result.job.scanSessionId).toBe('scan-1');
    expect(result.job.inventoryDomain).toBe('contract_parts');
    expect(result.job.closeoutRequirements).toEqual(job.closeoutRequirements);
    expect(result.job.statusHistory).toEqual(job.statusHistory);
    expect(result.job.isRevisionRequired).toBe(true);
    expect(result.job.revisionStatus).toBe('Needs Revision');
  });

  it('requires explicit confirmation for completed jobs and preserves completion lifecycle history', () => {
    let lifecycle = createJobLifecycle();
    lifecycle = arriveAtJob(lifecycle, '2026-08-15T09:00:00.000Z');
    lifecycle = startJobWork(lifecycle, '2026-08-15T09:05:00.000Z');
    lifecycle = markJobWorkComplete(lifecycle, '2026-08-15T10:00:00.000Z');
    lifecycle = completeJobCloseout(lifecycle, '2026-08-15T10:10:00.000Z');
    const assigned = assignProcedureToJob(makeJob({ status: 'completed', isCompleted: true, lifecycle }), assignment).job;

    const blocked = assignProcedureToJob(assigned, { ...assignment, procedureVersion: '2.0.0' });
    expect(blocked).toMatchObject({ status: 'confirmation_required', reason: 'completed_job' });

    const confirmed = changeProcedureAssignmentWithConfirmation(assigned, { ...assignment, procedureVersion: '2.0.0' });
    expect(confirmed.status).toBe('updated');
    expect(confirmed.job.lifecycle?.completedAt).toBe('2026-08-15T10:10:00.000Z');
    expect(confirmed.job.lifecycle?.originalCompletedAt).toBe('2026-08-15T10:10:00.000Z');
  });

  it('rejects malformed procedure IDs, versions, and definition mismatches', () => {
    expect(assignProcedureToJob(makeJob(), { ...assignment, procedureId: 'bad id' }).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_PROCEDURE_ID' }),
    ]));
    expect(assignProcedureToJob(makeJob(), { ...assignment, procedureVersion: '0.0.0' }).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_PROCEDURE_VERSION' }),
    ]));
    expect(assignProcedureToJob(makeJob(), assignment, makeProcedure({ version: '9.0.0' })).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROCEDURE_VERSION_MISMATCH' }),
    ]));
  });

  it('keeps legacy jobs with no procedure valid', () => {
    const normalized = normalizeJobState(makeJob({ procedureAssignment: undefined, procedureAssignmentHistory: undefined }));

    expect(normalized.procedureAssignment).toBeUndefined();
    expect(normalized.procedureAssignmentHistory).toBeUndefined();
    expect(normalized.lifecycle).toBeDefined();
  });

  it('does not create duplicate history during repeated normalization', () => {
    const assigned = assignProcedureToJob(makeJob(), assignment).job;
    const once = normalizeJobState(assigned);
    const twice = normalizeJobState(once);

    expect(twice.procedureAssignmentHistory).toHaveLength(1);
    expect(twice.procedureAssignment).toEqual(assigned.procedureAssignment);
  });
});
