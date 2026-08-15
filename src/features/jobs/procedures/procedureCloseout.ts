import type { Job } from '../../../types';
import type { JobCloseoutRequirement, JobCloseoutRequirementKind } from '../jobCloseoutTypes';
import { getProcedureStepsInOrder } from './procedureDefinition';
import type { ProcedureResolutionResult } from './procedureCatalog';
import { resolveProcedureAssignment, type ProcedureCatalog } from './procedureCatalog';
import { evaluateProcedureCondition, type ProcedureRequirementContext } from './procedureConditions';
import type {
  ProcedureDefinition,
  ProcedureEquipmentRequirement,
  ProcedureProofRequirement,
  ProcedureStep,
  ProcedureSupportEscalation,
  ProcedureTestingRequirement,
} from './types';

export type EffectiveCloseoutResolution = ProcedureResolutionResult;

export interface EffectiveCloseoutRequirementsResult {
  requirements: JobCloseoutRequirement[];
  procedureResolution: EffectiveCloseoutResolution;
}

const SOURCE_ORDER: Record<string, number> = {
  manual: 0,
  step: 1,
  proof: 2,
  equipment: 3,
  testing: 4,
  support: 5,
  unresolved: 6,
};

function scopedProcedureRequirementId(
  procedure: ProcedureDefinition,
  source: 'step' | 'proof' | 'equipment' | 'testing' | 'support',
  stableId: string,
): string {
  return `procedure:${procedure.id}@${procedure.version}:${source}:${stableId}`;
}

function isSatisfied(id: string, context: ProcedureRequirementContext): boolean {
  if (context.requirementSatisfaction && id in context.requirementSatisfaction) {
    return context.requirementSatisfaction[id] === true;
  }
  return context.satisfiedRequirementIds?.includes(id) === true;
}

function activeForStep(step: ProcedureStep, context: ProcedureRequirementContext): boolean | undefined {
  if (step.classification !== 'conditional') return undefined;
  return evaluateProcedureCondition(step.condition, context).active;
}

function describeStep(step: ProcedureStep): string | undefined {
  return step.quickCheckpoint ?? step.guidedInstructions ?? step.warningText;
}

function createRequirement(
  procedure: ProcedureDefinition,
  source: 'step' | 'proof' | 'equipment' | 'testing' | 'support',
  stableId: string,
  kind: JobCloseoutRequirementKind,
  label: string,
  description: string | undefined,
  context: ProcedureRequirementContext,
  active?: boolean,
): JobCloseoutRequirement {
  const id = scopedProcedureRequirementId(procedure, source, stableId);
  return {
    id,
    kind,
    label,
    description,
    active,
    satisfied: isSatisfied(id, context),
  };
}

function deriveStepRequirement(
  procedure: ProcedureDefinition,
  step: ProcedureStep,
  context: ProcedureRequirementContext,
): JobCloseoutRequirement | undefined {
  if (step.classification === 'reference') {
    return createRequirement(procedure, 'step', step.id, 'reference', step.title, describeStep(step), context);
  }

  return createRequirement(
    procedure,
    'step',
    step.id,
    step.classification,
    step.title,
    describeStep(step),
    context,
    activeForStep(step, context),
  );
}

function deriveProofRequirement(
  procedure: ProcedureDefinition,
  step: ProcedureStep,
  requirement: ProcedureProofRequirement,
  context: ProcedureRequirementContext,
): JobCloseoutRequirement {
  const countText = requirement.minimumCount ? ` Minimum count: ${requirement.minimumCount}.` : '';
  const scopeText = requirement.visitScope ? ` Scope: ${requirement.visitScope}.` : '';
  return createRequirement(
    procedure,
    'proof',
    requirement.id,
    requirement.classification,
    requirement.label,
    `${requirement.instructions} Proof type: ${requirement.proofType}.${scopeText}${countText}`.trim(),
    context,
    activeForStep(step, context),
  );
}

function deriveEquipmentRequirement(
  procedure: ProcedureDefinition,
  step: ProcedureStep,
  requirement: ProcedureEquipmentRequirement,
  context: ProcedureRequirementContext,
): JobCloseoutRequirement {
  const details = [
    requirement.deviceModel ? `Device/model: ${requirement.deviceModel}.` : undefined,
    requirement.quantity ? `Quantity: ${requirement.quantity}.` : undefined,
    `Serial requirement: ${requirement.serialRequirement}.`,
    requirement.trackRemovedEquipment ? 'Removed equipment tracking required.' : undefined,
    requirement.returnRequired ? 'Return required.' : undefined,
  ].filter(Boolean).join(' ');

  return createRequirement(
    procedure,
    'equipment',
    requirement.id,
    requirement.classification,
    requirement.label,
    details,
    context,
    activeForStep(step, context),
  );
}

function deriveTestingRequirement(
  procedure: ProcedureDefinition,
  step: ProcedureStep,
  requirement: ProcedureTestingRequirement,
  context: ProcedureRequirementContext,
): JobCloseoutRequirement {
  return createRequirement(
    procedure,
    'testing',
    requirement.id,
    requirement.classification,
    requirement.label,
    [requirement.instructions, `Validation type: ${requirement.validationType}.`].filter(Boolean).join(' '),
    context,
    activeForStep(step, context),
  );
}

function deriveSupportRequirement(
  procedure: ProcedureDefinition,
  step: ProcedureStep,
  escalation: ProcedureSupportEscalation,
  context: ProcedureRequirementContext,
): JobCloseoutRequirement | undefined {
  if (!escalation.referenceNumberRequired) return undefined;

  const conditionActive = escalation.conditional
    ? evaluateProcedureCondition(escalation.condition, context).active
    : activeForStep(step, context);

  return createRequirement(
    procedure,
    'support',
    escalation.id,
    escalation.conditional ? 'conditional' : 'required',
    escalation.escalationLabel,
    `${escalation.instructions} Contact: ${escalation.contactRoleType}. Reference/case number required.`,
    context,
    conditionActive,
  );
}

export function deriveProcedureCloseoutRequirements(
  procedure: ProcedureDefinition,
  context: ProcedureRequirementContext = {},
): JobCloseoutRequirement[] {
  return dedupeRequirements(getProcedureStepsInOrder(procedure).flatMap(step => {
    const requirements: Array<JobCloseoutRequirement | undefined> = [
      deriveStepRequirement(procedure, step, context),
      ...(step.proofRequirements ?? []).map(requirement =>
        deriveProofRequirement(procedure, step, requirement, context),
      ),
      ...(step.equipmentRequirements ?? []).map(requirement =>
        deriveEquipmentRequirement(procedure, step, requirement, context),
      ),
      ...(step.testingRequirements ?? []).map(requirement =>
        deriveTestingRequirement(procedure, step, requirement, context),
      ),
      ...(step.supportEscalations ?? []).map(escalation =>
        deriveSupportRequirement(procedure, step, escalation, context),
      ),
    ];
    return requirements.filter((requirement): requirement is JobCloseoutRequirement => Boolean(requirement));
  }));
}

function requirementSourceOrder(requirement: JobCloseoutRequirement): number {
  if (!requirement.id.startsWith('procedure:')) return SOURCE_ORDER.manual;
  const source = requirement.id.split(':')[2];
  return SOURCE_ORDER[source] ?? 99;
}

function sortRequirements(requirements: JobCloseoutRequirement[]): JobCloseoutRequirement[] {
  return [...requirements].sort((a, b) => {
    const orderCompare = requirementSourceOrder(a) - requirementSourceOrder(b);
    if (orderCompare !== 0) return orderCompare;
    return a.id.localeCompare(b.id);
  });
}

function dedupeRequirements(requirements: JobCloseoutRequirement[]): JobCloseoutRequirement[] {
  const byId = new Map<string, JobCloseoutRequirement>();
  requirements.forEach(requirement => {
    if (!byId.has(requirement.id)) byId.set(requirement.id, requirement);
  });
  return [...byId.values()];
}

function unresolvedProcedureRequirement(resolution: ProcedureResolutionResult): JobCloseoutRequirement {
  const assignment = resolution.assignment;
  const suffix = assignment
    ? `${assignment.procedureId}@${assignment.procedureVersion}`
    : resolution.status;

  return {
    id: `procedure-unresolved:${suffix}`,
    kind: 'required',
    label: 'Assigned procedure cannot be resolved',
    description: resolution.reason ?? 'The exact assigned procedure version is unavailable.',
    satisfied: false,
  };
}

export function mergeCloseoutRequirements(
  manualRequirements: JobCloseoutRequirement[] = [],
  procedureRequirements: JobCloseoutRequirement[] = [],
): JobCloseoutRequirement[] {
  return sortRequirements(dedupeRequirements([...manualRequirements, ...procedureRequirements]));
}

export function getEffectiveCloseoutRequirements(
  job: Job,
  options: {
    procedureCatalog?: ProcedureCatalog;
    procedureResolution?: ProcedureResolutionResult;
    context?: ProcedureRequirementContext;
  } = {},
): EffectiveCloseoutRequirementsResult {
  const context = { ...options.context, job };
  const procedureResolution = options.procedureResolution ?? resolveProcedureAssignment(job, options.procedureCatalog);
  let procedureRequirements: JobCloseoutRequirement[] = [];

  if (procedureResolution.status === 'resolved' && procedureResolution.procedure) {
    procedureRequirements = deriveProcedureCloseoutRequirements(procedureResolution.procedure, context);
  } else if (procedureResolution.status === 'not_found' || procedureResolution.status === 'invalid_assignment') {
    procedureRequirements = [unresolvedProcedureRequirement(procedureResolution)];
  }

  return {
    requirements: mergeCloseoutRequirements(job.closeoutRequirements, procedureRequirements),
    procedureResolution,
  };
}
