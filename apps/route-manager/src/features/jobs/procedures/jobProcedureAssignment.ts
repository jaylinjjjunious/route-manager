import type {
  Job,
  JobProcedureAssignment,
  JobProcedureAssignmentHistoryEvent,
  JobProcedureAssignmentReference,
  JobProcedureAssignmentSource,
} from '../../../types';
import type { ProcedureDefinition } from './types';

export interface ProcedureAssignmentInput {
  procedureId: string;
  procedureVersion: string;
  assignmentSource: JobProcedureAssignmentSource;
  assignedAt?: string;
  assignedBy?: string;
  note?: string;
}

export interface ProcedureAssignmentValidationError {
  code: string;
  message: string;
  path: string;
}

export type ProcedureAssignmentResultStatus =
  | 'updated'
  | 'removed'
  | 'unchanged'
  | 'rejected'
  | 'confirmation_required';

export interface ProcedureAssignmentResult {
  status: ProcedureAssignmentResultStatus;
  job: Job;
  errors: ProcedureAssignmentValidationError[];
  confirmationRequired: boolean;
  reason?: 'work_started' | 'completed_job';
}

export interface ProcedureAssignmentChangePolicy {
  allowed: boolean;
  confirmationRequired: boolean;
  reason?: 'work_started' | 'completed_job';
}

const VALID_ASSIGNMENT_SOURCES: JobProcedureAssignmentSource[] = ['manual', 'template', 'import_suggestion'];
const PROCEDURE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const error = (code: string, message: string, path: string): ProcedureAssignmentValidationError => ({
  code,
  message,
  path,
});

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim().length === 0;

export function hasProcedureAssignment(job: Pick<Job, 'procedureAssignment'>): boolean {
  return Boolean(job.procedureAssignment);
}

export function isSameProcedureAssignment(
  left?: JobProcedureAssignmentReference | null,
  right?: JobProcedureAssignmentReference | null,
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.procedureId === right.procedureId && left.procedureVersion === right.procedureVersion;
}

function isValidPositiveVersion(version: string): boolean {
  const trimmed = version.trim();
  if (!trimmed || trimmed.startsWith('-')) return false;
  if (/^0+(\.0+)*$/.test(trimmed)) return false;
  if (/^\d+(\.\d+)*$/.test(trimmed)) return trimmed.split('.').some(part => Number(part) > 0);
  return true;
}

function validateAssignmentInput(
  input: ProcedureAssignmentInput,
  procedure?: ProcedureDefinition,
): ProcedureAssignmentValidationError[] {
  const errors: ProcedureAssignmentValidationError[] = [];

  if (isBlank(input.procedureId) || !PROCEDURE_ID_PATTERN.test(input.procedureId.trim())) {
    errors.push(error('INVALID_PROCEDURE_ID', 'Procedure ID must be a non-empty stable identifier.', 'procedureId'));
  }
  if (isBlank(input.procedureVersion) || !isValidPositiveVersion(input.procedureVersion)) {
    errors.push(error('INVALID_PROCEDURE_VERSION', 'Procedure version must be a valid positive version.', 'procedureVersion'));
  }
  if (!VALID_ASSIGNMENT_SOURCES.includes(input.assignmentSource)) {
    errors.push(error('INVALID_ASSIGNMENT_SOURCE', 'Assignment source is invalid.', 'assignmentSource'));
  }
  if (procedure && procedure.id !== input.procedureId) {
    errors.push(error('PROCEDURE_ID_MISMATCH', 'Procedure definition ID does not match the requested assignment.', 'procedureId'));
  }
  if (procedure && procedure.version !== input.procedureVersion) {
    errors.push(error('PROCEDURE_VERSION_MISMATCH', 'Procedure definition version does not match the requested assignment.', 'procedureVersion'));
  }

  return errors;
}

function hasWorkStarted(job: Job): boolean {
  const lifecycle = job.lifecycle;
  if (!lifecycle) return false;
  return lifecycle.status === 'in_progress'
    || lifecycle.status === 'work_complete_pending_closeout'
    || lifecycle.status === 'completed'
    || lifecycle.events.some(event => ['started_work', 'work_complete', 'closeout_completed'].includes(event.type))
    || lifecycle.visits.some(visit => Boolean(visit.startedWorkAt));
}

function isCompletedJob(job: Job): boolean {
  return job.status === 'completed'
    || job.status === 'finished'
    || job.isCompleted === true
    || job.lifecycle?.status === 'completed';
}

export function canChangeProcedureAssignment(job: Job): ProcedureAssignmentChangePolicy {
  if (isCompletedJob(job)) {
    return { allowed: false, confirmationRequired: true, reason: 'completed_job' };
  }
  if (hasWorkStarted(job)) {
    return { allowed: false, confirmationRequired: true, reason: 'work_started' };
  }
  return { allowed: true, confirmationRequired: false };
}

function buildAssignment(input: ProcedureAssignmentInput): JobProcedureAssignment {
  return {
    procedureId: input.procedureId.trim(),
    procedureVersion: input.procedureVersion.trim(),
    assignedAt: input.assignedAt ?? new Date().toISOString(),
    assignmentSource: input.assignmentSource,
    assignedBy: input.assignedBy,
    note: input.note,
  };
}

function appendHistory(
  job: Job,
  action: JobProcedureAssignmentHistoryEvent['action'],
  input: ProcedureAssignmentInput,
  nextAssignment: JobProcedureAssignment | undefined,
  confirmed: boolean,
): Job {
  const event: JobProcedureAssignmentHistoryEvent = {
    timestamp: input.assignedAt ?? nextAssignment?.assignedAt ?? new Date().toISOString(),
    action,
    from: job.procedureAssignment
      ? { procedureId: job.procedureAssignment.procedureId, procedureVersion: job.procedureAssignment.procedureVersion }
      : undefined,
    to: nextAssignment
      ? { procedureId: nextAssignment.procedureId, procedureVersion: nextAssignment.procedureVersion }
      : undefined,
    assignmentSource: input.assignmentSource,
    assignedBy: input.assignedBy,
    note: input.note,
    confirmed,
  };
  return { ...job, procedureAssignmentHistory: [...(job.procedureAssignmentHistory ?? []), event] };
}

function applyAssignmentChange(
  job: Job,
  input: ProcedureAssignmentInput,
  procedure: ProcedureDefinition | undefined,
  confirmed: boolean,
  removing = false,
): ProcedureAssignmentResult {
  const errors = removing ? [] : validateAssignmentInput(input, procedure);
  if (errors.length > 0) {
    return { status: 'rejected', job, errors, confirmationRequired: false };
  }

  const policy = canChangeProcedureAssignment(job);
  if (policy.confirmationRequired && !confirmed) {
    return { status: 'confirmation_required', job, errors: [], confirmationRequired: true, reason: policy.reason };
  }

  if (removing) {
    if (!job.procedureAssignment) return { status: 'unchanged', job, errors: [], confirmationRequired: false };
    const withHistory = appendHistory(job, 'removed', input, undefined, confirmed);
    const { procedureAssignment: _removed, ...nextJob } = withHistory;
    return { status: 'removed', job: nextJob, errors: [], confirmationRequired: false };
  }

  const nextAssignment = buildAssignment(input);
  if (isSameProcedureAssignment(job.procedureAssignment, nextAssignment)) {
    return { status: 'unchanged', job, errors: [], confirmationRequired: false };
  }

  const action: JobProcedureAssignmentHistoryEvent['action'] = job.procedureAssignment ? 'replaced' : 'assigned';
  const withAssignment: Job = { ...job, procedureAssignment: nextAssignment };
  const historyCarrier = appendHistory(job, action, input, nextAssignment, confirmed);
  const withHistory: Job = { ...withAssignment, procedureAssignmentHistory: historyCarrier.procedureAssignmentHistory };
  return { status: 'updated', job: withHistory, errors: [], confirmationRequired: false };
}

export function assignProcedureToJob(
  job: Job,
  input: ProcedureAssignmentInput,
  procedure?: ProcedureDefinition,
): ProcedureAssignmentResult {
  return applyAssignmentChange(job, input, procedure, false);
}

export function changeProcedureAssignmentWithConfirmation(
  job: Job,
  input: ProcedureAssignmentInput,
  procedure?: ProcedureDefinition,
): ProcedureAssignmentResult {
  return applyAssignmentChange(job, input, procedure, true);
}

export function removeProcedureFromJob(
  job: Job,
  options: {
    assignmentSource: JobProcedureAssignmentSource;
    assignedAt?: string;
    assignedBy?: string;
    note?: string;
    confirmed?: boolean;
  },
): ProcedureAssignmentResult {
  return applyAssignmentChange(
    job,
    {
      procedureId: job.procedureAssignment?.procedureId ?? 'removed-procedure',
      procedureVersion: job.procedureAssignment?.procedureVersion ?? '1',
      assignmentSource: options.assignmentSource,
      assignedAt: options.assignedAt,
      assignedBy: options.assignedBy,
      note: options.note,
    },
    undefined,
    options.confirmed === true,
    true,
  );
}
