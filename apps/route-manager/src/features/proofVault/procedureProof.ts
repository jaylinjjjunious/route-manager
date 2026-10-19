import type { Job } from '../../types';
import type { ProcedureDefinition, ProcedureProofRequirement, ProcedureProofType, ProcedureStep } from '../jobs/procedures/types';
import type { ProofAsset, ProofAssetKind, ProofRecord } from './types';

export interface ProcedureProofRequirementIdentity {
  requirementId: string;
  procedureId: string;
  procedureVersion: string;
  procedureStepId: string;
  proofType?: ProcedureProofType;
  visitId?: string;
}

export interface ProofEvidence extends ProofAsset {
  jobId: string;
  assetKind: ProofAssetKind;
}

export interface ProofRequirementEvaluationContext {
  job?: Job;
  visitId?: string;
  requiredVisitIds?: string[];
}

export interface ProofRequirementEvaluationResult {
  requirementId: string;
  satisfied: boolean;
  requiredCount: number;
  matchingCount: number;
  matchingProofIds: string[];
  visitScope?: ProcedureProofRequirement['visitScope'];
  visitIdsChecked?: string[];
  reason?: string;
}

export interface ProcedureProofCaptureInput extends ProcedureProofRequirementIdentity {
  fileName: string;
  dataUrl: string;
  addedAt?: string;
  id?: string;
}

const proofTypeToAssetKinds = (proofType: ProcedureProofType): ProofAssetKind[] => {
  switch (proofType) {
    case 'photo':
      return ['photos'];
    case 'screenshot':
      return ['screenshots'];
    case 'receipt':
    case 'document':
      return ['receipts'];
    default:
      return [];
  }
};

export function getProofForJob(
  proofRecords: ProofRecord[] | Record<string, ProofRecord> | undefined,
  jobId: string,
): ProofEvidence[] {
  if (!proofRecords) return [];
  const records = Array.isArray(proofRecords) ? proofRecords : Object.values(proofRecords);
  return records
    .filter(record => record.jobId === jobId)
    .flatMap(record => ([
      ...record.photos.map(asset => ({ ...asset, jobId: record.jobId, assetKind: 'photos' as const })),
      ...record.screenshots.map(asset => ({ ...asset, jobId: record.jobId, assetKind: 'screenshots' as const })),
      ...record.receipts.map(asset => ({ ...asset, jobId: record.jobId, assetKind: 'receipts' as const })),
    ]));
}

function currentVisitId(context: ProofRequirementEvaluationContext): string | undefined {
  return context.visitId ?? context.job?.lifecycle?.activeVisitId;
}

function finalVisitId(job: Job | undefined): string | undefined {
  return job?.lifecycle?.visits.at(-1)?.id;
}

function visitIdsForRequirement(
  requirement: ProcedureProofRequirement,
  context: ProofRequirementEvaluationContext,
): string[] | undefined {
  switch (requirement.visitScope) {
    case 'current_visit':
      return currentVisitId(context) ? [currentVisitId(context) as string] : [];
    case 'final_visit':
      return finalVisitId(context.job) ? [finalVisitId(context.job) as string] : [];
    case 'per_visit':
      if (context.requiredVisitIds) return context.requiredVisitIds;
      return context.job?.lifecycle?.visits.map(visit => visit.id) ?? [];
    case 'any_visit':
    case undefined:
      return undefined;
  }
}

function proofTypeMatches(proof: ProofEvidence, proofType: ProcedureProofType): boolean {
  if (proof.proofType) return proof.proofType === proofType;
  return proofTypeToAssetKinds(proofType).includes(proof.assetKind);
}

export function doesProofSatisfyRequirement(
  proof: ProofEvidence,
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureProofRequirement,
  context: ProofRequirementEvaluationContext = {},
): boolean {
  if (proof.requirementId !== requirement.id) return false;
  if (proof.procedureId !== procedure.id) return false;
  if (proof.procedureVersion !== procedure.version) return false;
  if (proof.procedureStepId !== step.id) return false;
  if (!proofTypeMatches(proof, requirement.proofType)) return false;

  const visitIds = visitIdsForRequirement(requirement, context);
  if (visitIds === undefined) return true;
  if (visitIds.length === 0) return false;
  return Boolean(proof.visitId && visitIds.includes(proof.visitId));
}

function evaluateForVisitIds(
  proofs: ProofEvidence[],
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureProofRequirement,
  context: ProofRequirementEvaluationContext,
  visitIds: string[] | undefined,
): ProofRequirementEvaluationResult {
  const requiredCount = requirement.minimumCount ?? 1;
  const matchingProofs = proofs.filter(proof =>
    doesProofSatisfyRequirement(proof, procedure, step, requirement, context),
  );

  if (requirement.visitScope === 'per_visit' && visitIds && visitIds.length > 0) {
    const missingVisit = visitIds.find(visitId =>
      matchingProofs.filter(proof => proof.visitId === visitId).length < requiredCount,
    );
    return {
      requirementId: requirement.id,
      satisfied: !missingVisit,
      requiredCount,
      matchingCount: matchingProofs.length,
      matchingProofIds: matchingProofs.map(proof => proof.id).sort(),
      visitScope: requirement.visitScope,
      visitIdsChecked: visitIds,
      reason: missingVisit ? `Missing required proof for visit ${missingVisit}.` : undefined,
    };
  }

  return {
    requirementId: requirement.id,
    satisfied: matchingProofs.length >= requiredCount,
    requiredCount,
    matchingCount: matchingProofs.length,
    matchingProofIds: matchingProofs.map(proof => proof.id).sort(),
    visitScope: requirement.visitScope,
    visitIdsChecked: visitIds,
  };
}

export function evaluateProofRequirement(
  proofs: ProofEvidence[],
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureProofRequirement,
  context: ProofRequirementEvaluationContext = {},
): ProofRequirementEvaluationResult {
  const visitIds = visitIdsForRequirement(requirement, context);
  if (visitIds?.length === 0 && requirement.visitScope && requirement.visitScope !== 'any_visit') {
    return {
      requirementId: requirement.id,
      satisfied: false,
      requiredCount: requirement.minimumCount ?? 1,
      matchingCount: 0,
      matchingProofIds: [],
      visitScope: requirement.visitScope,
      visitIdsChecked: visitIds,
      reason: 'No matching visit context.',
    };
  }
  return evaluateForVisitIds(proofs, procedure, step, requirement, context, visitIds);
}

export function getSatisfiedProofRequirementIds(
  proofs: ProofEvidence[],
  procedure: ProcedureDefinition,
  context: ProofRequirementEvaluationContext = {},
): string[] {
  return procedure.steps.flatMap(step =>
    (step.proofRequirements ?? [])
      .filter(requirement => evaluateProofRequirement(proofs, procedure, step, requirement, context).satisfied)
      .map(requirement => requirement.id),
  ).sort();
}

export function buildProcedureProofAsset(input: ProcedureProofCaptureInput): ProofAsset {
  return {
    id: input.id ?? `proof-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: input.fileName,
    dataUrl: input.dataUrl,
    addedAt: input.addedAt ?? new Date().toISOString(),
    source: 'procedure_requirement',
    proofType: input.proofType,
    requirementId: input.requirementId,
    procedureId: input.procedureId,
    procedureVersion: input.procedureVersion,
    procedureStepId: input.procedureStepId,
    visitId: input.visitId,
  };
}
