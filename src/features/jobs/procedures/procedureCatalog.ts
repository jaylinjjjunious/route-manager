import type { Job, JobProcedureAssignment } from '../../../types';
import { GENERIC_PROCEDURE_CATALOG } from './genericProcedureCatalog';
import { SONIC_PROCEDURE_CATALOG } from './sonicProcedureCatalog';
import type { ProcedureDefinition } from './types';

export type ProcedureCatalog = readonly ProcedureDefinition[];

export type ProcedureResolutionStatus =
  | 'resolved'
  | 'unassigned'
  | 'not_found'
  | 'invalid_assignment';

export interface ProcedureResolutionResult {
  status: ProcedureResolutionStatus;
  procedure?: ProcedureDefinition;
  reason?: string;
  assignment?: JobProcedureAssignment;
}

export const DEFAULT_PROCEDURE_CATALOG: ProcedureCatalog = composeProcedureCatalog(
  GENERIC_PROCEDURE_CATALOG,
  SONIC_PROCEDURE_CATALOG,
);

const PROCEDURE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function isValidProcedureId(procedureId: unknown): procedureId is string {
  return typeof procedureId === 'string'
    && procedureId.trim().length > 0
    && PROCEDURE_ID_PATTERN.test(procedureId.trim());
}

function isValidProcedureVersion(version: unknown): version is string {
  if (typeof version !== 'string') return false;
  const trimmed = version.trim();
  if (!trimmed || trimmed.startsWith('-')) return false;
  if (/^0+(\.0+)*$/.test(trimmed)) return false;
  if (/^\d+(\.\d+)*$/.test(trimmed)) return trimmed.split('.').some(part => Number(part) > 0);
  return true;
}

export function composeProcedureCatalog(
  ...sources: Array<ProcedureCatalog | ProcedureDefinition | undefined>
): ProcedureCatalog {
  const byExactVersion = new Map<string, ProcedureDefinition>();

  sources.forEach(source => {
    if (!source) return;
    const procedures = Array.isArray(source) ? source : [source];
    procedures.forEach(procedure => {
      byExactVersion.set(`${procedure.id}@${procedure.version}`, procedure);
    });
  });

  return [...byExactVersion.values()].sort((a, b) => {
    const idCompare = a.id.localeCompare(b.id);
    if (idCompare !== 0) return idCompare;
    return a.version.localeCompare(b.version);
  });
}

export function getProcedureByIdAndVersion(
  catalog: ProcedureCatalog,
  procedureId: string,
  procedureVersion: string,
): ProcedureDefinition | undefined {
  return catalog.find(procedure =>
    procedure.id === procedureId && procedure.version === procedureVersion,
  );
}

export function listProcedureVersions(
  catalog: ProcedureCatalog,
  procedureId: string,
): string[] {
  return catalog
    .filter(procedure => procedure.id === procedureId)
    .map(procedure => procedure.version)
    .sort((a, b) => a.localeCompare(b));
}

export function hasResolvedProcedure(result: ProcedureResolutionResult): boolean {
  return result.status === 'resolved' && Boolean(result.procedure);
}

export function resolveProcedureAssignment(
  job: Pick<Job, 'procedureAssignment'>,
  catalog: ProcedureCatalog = DEFAULT_PROCEDURE_CATALOG,
): ProcedureResolutionResult {
  const assignment = job.procedureAssignment;
  if (!assignment) return { status: 'unassigned', reason: 'Job has no procedure assignment.' };

  if (!isValidProcedureId(assignment.procedureId)) {
    return {
      status: 'invalid_assignment',
      assignment,
      reason: 'Procedure assignment has a malformed procedure ID.',
    };
  }
  if (!isValidProcedureVersion(assignment.procedureVersion)) {
    return {
      status: 'invalid_assignment',
      assignment,
      reason: 'Procedure assignment has an invalid procedure version.',
    };
  }

  const procedure = getProcedureByIdAndVersion(
    catalog,
    assignment.procedureId.trim(),
    assignment.procedureVersion.trim(),
  );
  if (!procedure) {
    return {
      status: 'not_found',
      assignment,
      reason: `Procedure ${assignment.procedureId}@${assignment.procedureVersion} was not found in the catalog.`,
    };
  }

  return { status: 'resolved', assignment, procedure };
}
