import type {
  ProcedureCondition,
  ProcedureDefinition,
  ProcedureStep,
  ProcedureValidationError,
  ProcedureValidationResult,
  ProcedureVersionReference,
} from './types';

const REQUIRED_PROCEDURE_FIELDS: Array<keyof ProcedureDefinition> = [
  'id',
  'customerKey',
  'name',
  'description',
  'version',
  'status',
  'category',
  'jobType',
  'createdAt',
  'updatedAt',
];

const addError = (
  errors: ProcedureValidationError[],
  code: string,
  message: string,
  path: string,
): void => {
  errors.push({ code, message, path, severity: 'error' });
};

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim().length === 0;

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && !(typeof value === 'string' && value.trim().length === 0);

export function getProcedureStepById(
  procedure: ProcedureDefinition,
  stepId: string,
): ProcedureStep | undefined {
  return procedure.steps.find(step => step.id === stepId);
}

export function getProcedureStepsInOrder(procedure: ProcedureDefinition): ProcedureStep[] {
  return [...procedure.steps].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.id.localeCompare(b.id);
  });
}

export function isProcedureVersionImmutable(
  procedure: ProcedureDefinition,
  usedVersions: ProcedureVersionReference[] = [],
): boolean {
  return usedVersions.some(reference =>
    reference.procedureId === procedure.id && reference.version === procedure.version,
  );
}

export function createNextProcedureVersion(
  procedure: ProcedureDefinition,
  options: { nextVersion: string; timestamp?: string; status?: ProcedureDefinition['status'] },
): ProcedureDefinition {
  const timestamp = options.timestamp ?? new Date().toISOString();
  return {
    ...structuredClone(procedure),
    version: options.nextVersion,
    status: options.status ?? 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function validateStableStepIdsUnique(procedure: ProcedureDefinition): ProcedureValidationResult {
  const errors: ProcedureValidationError[] = [];
  const seen = new Set<string>();

  procedure.steps.forEach((step, index) => {
    if (isBlank(step.id)) {
      addError(errors, 'STEP_ID_REQUIRED', 'Step ID is required.', `steps[${index}].id`);
      return;
    }
    if (seen.has(step.id)) {
      addError(errors, 'DUPLICATE_STEP_ID', `Duplicate step ID "${step.id}".`, `steps[${index}].id`);
      return;
    }
    seen.add(step.id);
  });

  return { valid: errors.length === 0, errors };
}

export function validateNestedRequirementIdsUnique(procedure: ProcedureDefinition): ProcedureValidationResult {
  const errors: ProcedureValidationError[] = [];
  const seen = new Map<string, string>();

  const checkId = (id: string | undefined, path: string) => {
    if (isBlank(id)) {
      addError(errors, 'NESTED_REQUIREMENT_ID_REQUIRED', 'Nested requirement ID is required.', path);
      return;
    }
    const existingPath = seen.get(id);
    if (existingPath) {
      addError(errors, 'DUPLICATE_NESTED_REQUIREMENT_ID', `Duplicate nested requirement ID "${id}".`, `${path} (first used at ${existingPath})`);
      return;
    }
    seen.set(id, path);
  };

  procedure.steps.forEach((step, stepIndex) => {
    step.proofRequirements?.forEach((requirement, index) =>
      checkId(requirement.id, `steps[${stepIndex}].proofRequirements[${index}].id`),
    );
    step.equipmentRequirements?.forEach((requirement, index) =>
      checkId(requirement.id, `steps[${stepIndex}].equipmentRequirements[${index}].id`),
    );
    step.testingRequirements?.forEach((requirement, index) =>
      checkId(requirement.id, `steps[${stepIndex}].testingRequirements[${index}].id`),
    );
    step.supportEscalations?.forEach((escalation, index) =>
      checkId(escalation.id, `steps[${stepIndex}].supportEscalations[${index}].id`),
    );
  });

  return { valid: errors.length === 0, errors };
}

function validateCondition(
  condition: ProcedureCondition | undefined,
  path: string,
  errors: ProcedureValidationError[],
): void {
  if (!condition) return;

  switch (condition.type) {
    case 'device_type_equals':
      if (isBlank(condition.deviceType)) addError(errors, 'MALFORMED_CONDITION', 'Device type condition requires deviceType.', `${path}.deviceType`);
      break;
    case 'job_field_equals':
      if (isBlank(condition.field)) addError(errors, 'MALFORMED_CONDITION', 'Job field condition requires field.', `${path}.field`);
      if (!hasValue(condition.value)) addError(errors, 'MALFORMED_CONDITION', 'Job field condition requires value.', `${path}.value`);
      break;
    case 'previous_answer_equals':
      if (isBlank(condition.stepId)) addError(errors, 'MALFORMED_CONDITION', 'Previous answer condition requires stepId.', `${path}.stepId`);
      if (!hasValue(condition.value)) addError(errors, 'MALFORMED_CONDITION', 'Previous answer condition requires value.', `${path}.value`);
      break;
    case 'equipment_present':
    case 'equipment_missing':
      if (isBlank(condition.equipmentRequirementId)) addError(errors, 'MALFORMED_CONDITION', 'Equipment condition requires equipmentRequirementId.', `${path}.equipmentRequirementId`);
      break;
    case 'issue_present':
    case 'blocker_present':
      break;
    default:
      addError(errors, 'UNKNOWN_CONDITION_TYPE', 'Condition type is not supported.', `${path}.type`);
  }
}

export function validateConditionalDefinitions(procedure: ProcedureDefinition): ProcedureValidationResult {
  const errors: ProcedureValidationError[] = [];

  procedure.steps.forEach((step, stepIndex) => {
    if (step.classification === 'conditional' && !step.condition) {
      addError(errors, 'CONDITIONAL_STEP_REQUIRES_CONDITION', 'Conditional steps require a condition definition.', `steps[${stepIndex}].condition`);
    }
    validateCondition(step.condition, `steps[${stepIndex}].condition`, errors);
    step.supportEscalations?.forEach((escalation, index) => {
      if (escalation.conditional && !escalation.condition) {
        addError(errors, 'CONDITIONAL_ESCALATION_REQUIRES_CONDITION', 'Conditional support escalations require a condition definition.', `steps[${stepIndex}].supportEscalations[${index}].condition`);
      }
      validateCondition(escalation.condition, `steps[${stepIndex}].supportEscalations[${index}].condition`, errors);
    });
  });

  return { valid: errors.length === 0, errors };
}

export function validateGuidedAndQuickTextPresence(procedure: ProcedureDefinition): ProcedureValidationResult {
  const errors: ProcedureValidationError[] = [];

  procedure.steps.forEach((step, index) => {
    if (isBlank(step.title)) addError(errors, 'STEP_TITLE_REQUIRED', 'Step title is required.', `steps[${index}].title`);
    if (step.classification === 'reference') {
      if (isBlank(step.guidedInstructions) && isBlank(step.quickCheckpoint)) {
        addError(errors, 'REFERENCE_STEP_TEXT_REQUIRED', 'Reference steps require guided instructions or quick checkpoint text.', `steps[${index}]`);
      }
      return;
    }
    if (isBlank(step.guidedInstructions)) {
      addError(errors, 'GUIDED_INSTRUCTIONS_REQUIRED', 'Guided Mode instructions are required for actionable steps.', `steps[${index}].guidedInstructions`);
    }
    if (isBlank(step.quickCheckpoint)) {
      addError(errors, 'QUICK_CHECKPOINT_REQUIRED', 'Quick Mode checkpoint text is required for actionable steps.', `steps[${index}].quickCheckpoint`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validateProcedureDefinition(procedure: Partial<ProcedureDefinition>): ProcedureValidationResult {
  const errors: ProcedureValidationError[] = [];

  REQUIRED_PROCEDURE_FIELDS.forEach(field => {
    if (isBlank(procedure[field])) {
      addError(errors, 'PROCEDURE_FIELD_REQUIRED', `Procedure field "${field}" is required.`, field);
    }
  });

  if (procedure.status && !['draft', 'active', 'retired'].includes(procedure.status)) {
    addError(errors, 'INVALID_PROCEDURE_STATUS', 'Procedure status must be draft, active, or retired.', 'status');
  }

  if (!Array.isArray(procedure.steps) || procedure.steps.length === 0) {
    addError(errors, 'PROCEDURE_STEPS_REQUIRED', 'Procedure requires at least one step.', 'steps');
    return { valid: false, errors };
  }

  const fullProcedure = procedure as ProcedureDefinition;
  fullProcedure.steps.forEach((step, index) => {
    if (!['required', 'conditional', 'recommended', 'reference'].includes(step.classification)) {
      addError(errors, 'INVALID_STEP_CLASSIFICATION', 'Step classification is invalid.', `steps[${index}].classification`);
    }
    if (!Number.isFinite(step.displayOrder)) {
      addError(errors, 'STEP_DISPLAY_ORDER_REQUIRED', 'Step display order must be a finite number.', `steps[${index}].displayOrder`);
    }

    step.proofRequirements?.forEach((requirement, requirementIndex) => {
      if (isBlank(requirement.label)) addError(errors, 'PROOF_LABEL_REQUIRED', 'Proof requirement label is required.', `steps[${index}].proofRequirements[${requirementIndex}].label`);
      if (isBlank(requirement.instructions)) addError(errors, 'PROOF_INSTRUCTIONS_REQUIRED', 'Proof requirement instructions are required.', `steps[${index}].proofRequirements[${requirementIndex}].instructions`);
      if (requirement.minimumCount !== undefined && requirement.minimumCount < 1) addError(errors, 'PROOF_MINIMUM_COUNT_INVALID', 'Proof minimum count must be at least 1.', `steps[${index}].proofRequirements[${requirementIndex}].minimumCount`);
    });

    step.equipmentRequirements?.forEach((requirement, requirementIndex) => {
      if (isBlank(requirement.label)) addError(errors, 'EQUIPMENT_LABEL_REQUIRED', 'Equipment requirement label is required.', `steps[${index}].equipmentRequirements[${requirementIndex}].label`);
      if (requirement.quantity !== undefined && requirement.quantity < 1) addError(errors, 'EQUIPMENT_QUANTITY_INVALID', 'Equipment quantity must be at least 1.', `steps[${index}].equipmentRequirements[${requirementIndex}].quantity`);
    });
  });

  errors.push(...validateStableStepIdsUnique(fullProcedure).errors);
  errors.push(...validateNestedRequirementIdsUnique(fullProcedure).errors);
  errors.push(...validateConditionalDefinitions(fullProcedure).errors);
  errors.push(...validateGuidedAndQuickTextPresence(fullProcedure).errors);

  return { valid: errors.length === 0, errors };
}
