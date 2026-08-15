import type { Job } from '../../../types';
import {
  evaluateJobCloseoutRequirements,
  getJobEffectiveCloseoutRequirements,
} from '../jobCloseout';
import type { JobCloseoutRequirement, JobCloseoutRequirementKind } from '../jobCloseoutTypes';
import { getProcedureStepsInOrder } from './procedureDefinition';
import type { ProcedureCatalog, ProcedureResolutionResult } from './procedureCatalog';
import { DEFAULT_PROCEDURE_CATALOG } from './procedureCatalog';
import {
  evaluateProcedureCondition,
  type ProcedureConditionEvaluationResult,
  type ProcedureRequirementContext,
} from './procedureConditions';
import type {
  ProcedureDefinition,
  ProcedureEquipmentRequirement,
  ProcedureProofRequirement,
  ProcedureStep,
  ProcedureSupportEscalation,
  ProcedureTestingRequirement,
} from './types';

export type ProcedureWorkspaceMode = 'guided' | 'quick';
export type ProcedureRequirementSource = 'step' | 'proof' | 'equipment' | 'testing' | 'support';

export interface ProcedureRequirementSummary {
  id: string;
  source: ProcedureRequirementSource;
  procedureStepId: string;
  label: string;
  kind: JobCloseoutRequirementKind;
  satisfied: boolean;
  blocking: boolean;
  active: boolean;
  closeoutRequirement?: JobCloseoutRequirement;
  proofRequirement?: ProcedureProofRequirement;
  equipmentRequirement?: ProcedureEquipmentRequirement;
  testingRequirement?: ProcedureTestingRequirement;
  supportEscalation?: ProcedureSupportEscalation;
}

export interface ProcedureStepProgress {
  step: ProcedureStep;
  phaseLabel: string;
  condition: ProcedureConditionEvaluationResult;
  applicable: boolean;
  unresolvedCondition: boolean;
  requirements: ProcedureRequirementSummary[];
  blockingRequirements: ProcedureRequirementSummary[];
  missingBlockingRequirements: ProcedureRequirementSummary[];
  satisfied: boolean;
}

export interface ProcedureProgressSummary {
  applicableSteps: number;
  completedSteps: number;
  missingRequiredItems: number;
  unresolvedConditionalItems: number;
  percentComplete: number;
  nextStep?: ProcedureStepProgress;
}

export interface ProcedureWorkspaceModel {
  resolution: ProcedureResolutionResult;
  procedure?: ProcedureDefinition;
  closeoutRequirements: JobCloseoutRequirement[];
  steps: ProcedureStepProgress[];
  summary: ProcedureProgressSummary;
}

export function scopedProcedureRequirementId(
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  source: ProcedureRequirementSource,
  stableId: string,
): string {
  return `procedure:${procedure.id}@${procedure.version}:${source}:${stableId}`;
}

function getCloseoutRequirement(
  requirements: JobCloseoutRequirement[],
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  source: ProcedureRequirementSource,
  stableId: string,
): JobCloseoutRequirement | undefined {
  const id = scopedProcedureRequirementId(procedure, source, stableId);
  return requirements.find(requirement => requirement.id === id);
}

function requirementActive(requirement: JobCloseoutRequirement | undefined): boolean {
  return !requirement || requirement.kind !== 'conditional' || requirement.active === true;
}

function requirementBlocking(requirement: JobCloseoutRequirement | undefined): boolean {
  return Boolean(
    requirement
      && requirementActive(requirement)
      && (requirement.kind === 'required' || requirement.kind === 'conditional')
      && requirement.satisfied !== true,
  );
}

function summarizeRequirement(
  procedure: ProcedureDefinition,
  stepId: string,
  source: ProcedureRequirementSource,
  stableId: string,
  label: string,
  fallbackKind: JobCloseoutRequirementKind,
  closeoutRequirements: JobCloseoutRequirement[],
  extras: Partial<ProcedureRequirementSummary> = {},
): ProcedureRequirementSummary {
  const closeoutRequirement = getCloseoutRequirement(closeoutRequirements, procedure, source, stableId);
  return {
    id: scopedProcedureRequirementId(procedure, source, stableId),
    source,
    procedureStepId: stepId,
    label,
    kind: closeoutRequirement?.kind ?? fallbackKind,
    satisfied: closeoutRequirement?.satisfied === true,
    active: requirementActive(closeoutRequirement),
    blocking: requirementBlocking(closeoutRequirement),
    closeoutRequirement,
    ...extras,
  };
}

function stepRequirements(
  procedure: ProcedureDefinition,
  step: ProcedureStep,
  closeoutRequirements: JobCloseoutRequirement[],
): ProcedureRequirementSummary[] {
  return [
    summarizeRequirement(procedure, step.id, 'step', step.id, step.title, step.classification, closeoutRequirements),
    ...(step.proofRequirements ?? []).map(requirement =>
      summarizeRequirement(procedure, step.id, 'proof', requirement.id, requirement.label, requirement.classification, closeoutRequirements, {
        proofRequirement: requirement,
      }),
    ),
    ...(step.equipmentRequirements ?? []).map(requirement =>
      summarizeRequirement(procedure, step.id, 'equipment', requirement.id, requirement.label, requirement.classification, closeoutRequirements, {
        equipmentRequirement: requirement,
      }),
    ),
    ...(step.testingRequirements ?? []).map(requirement =>
      summarizeRequirement(procedure, step.id, 'testing', requirement.id, requirement.label, requirement.classification, closeoutRequirements, {
        testingRequirement: requirement,
      }),
    ),
    ...(step.supportEscalations ?? []).map(escalation =>
      summarizeRequirement(procedure, step.id, 'support', escalation.id, escalation.escalationLabel, escalation.referenceNumberRequired ? 'required' : 'reference', closeoutRequirements, {
        supportEscalation: escalation,
      }),
    ),
  ];
}

export function deriveProcedureWorkspaceModel(
  job: Job,
  options: {
    procedureCatalog?: ProcedureCatalog;
    procedureResolution?: ProcedureResolutionResult;
    context?: ProcedureRequirementContext;
  } = {},
): ProcedureWorkspaceModel {
  const context = { ...options.context, job };
  const effective = getJobEffectiveCloseoutRequirements(job, {
    procedureCatalog: options.procedureCatalog ?? DEFAULT_PROCEDURE_CATALOG,
    procedureResolution: options.procedureResolution,
    context,
  });
  const procedure = effective.procedureResolution.procedure;

  if (!procedure) {
    return {
      resolution: effective.procedureResolution,
      closeoutRequirements: effective.requirements,
      steps: [],
      summary: {
        applicableSteps: 0,
        completedSteps: 0,
        missingRequiredItems: evaluateJobCloseoutRequirements(effective.requirements).missingRequiredItems.length,
        unresolvedConditionalItems: 0,
        percentComplete: 0,
      },
    };
  }

  const steps = getProcedureStepsInOrder(procedure).map(step => {
    const condition = evaluateProcedureCondition(step.condition, context);
    const unresolvedCondition = step.classification === 'conditional'
      && (condition.status === 'unresolved' || condition.status === 'malformed');
    const applicable = step.classification !== 'conditional'
      || condition.active
      || unresolvedCondition;
    const requirements = stepRequirements(procedure, step, effective.requirements);
    const activeRequirements = requirements.filter(requirement => requirement.active || unresolvedCondition);
    const blockingRequirements = activeRequirements.filter(requirement =>
      requirement.kind === 'required' || requirement.kind === 'conditional',
    );
    const missingBlockingRequirements = blockingRequirements.filter(requirement => !requirement.satisfied);
    const actionable = step.classification !== 'reference';

    return {
      step,
      phaseLabel: step.phaseLabel ?? step.phaseId ?? 'Procedure',
      condition,
      applicable,
      unresolvedCondition,
      requirements: activeRequirements,
      blockingRequirements,
      missingBlockingRequirements,
      satisfied: !actionable || !applicable || missingBlockingRequirements.length === 0,
    };
  });

  const applicableActionableSteps = steps.filter(item =>
    item.applicable && item.step.classification !== 'reference',
  );
  const completedSteps = applicableActionableSteps.filter(item => item.satisfied).length;
  const closeoutEvaluation = evaluateJobCloseoutRequirements(effective.requirements);
  const unresolvedConditionalItems = steps.filter(item => item.unresolvedCondition).length;

  return {
    resolution: effective.procedureResolution,
    procedure,
    closeoutRequirements: effective.requirements,
    steps,
    summary: {
      applicableSteps: applicableActionableSteps.length,
      completedSteps,
      missingRequiredItems: closeoutEvaluation.missingRequiredItems.length,
      unresolvedConditionalItems,
      percentComplete: applicableActionableSteps.length === 0
        ? 100
        : Math.round((completedSteps / applicableActionableSteps.length) * 100),
      nextStep: applicableActionableSteps.find(item => !item.satisfied),
    },
  };
}
