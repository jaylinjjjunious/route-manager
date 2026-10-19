import type { Job } from '../../types';
import type { JobCloseoutEvaluationResult, JobCloseoutRequirement } from './jobCloseoutTypes';
import {
  getEffectiveCloseoutRequirements,
  type EffectiveCloseoutRequirementsResult,
} from './procedures/procedureCloseout';
import type { ProcedureCatalog, ProcedureResolutionResult } from './procedures/procedureCatalog';
import type { ProcedureRequirementContext } from './procedures/procedureConditions';

const isRequirementActive = (requirement: JobCloseoutRequirement) =>
  requirement.kind !== 'conditional' || requirement.active === true;

const isRequirementSatisfied = (requirement: JobCloseoutRequirement) =>
  requirement.satisfied === true;

export function getJobCloseoutRequirements(job: Job): JobCloseoutRequirement[] {
  return job.closeoutRequirements ?? [];
}

export function getJobEffectiveCloseoutRequirements(
  job: Job,
  options: {
    procedureCatalog?: ProcedureCatalog;
    procedureResolution?: ProcedureResolutionResult;
    context?: ProcedureRequirementContext;
  } = {},
): EffectiveCloseoutRequirementsResult {
  return getEffectiveCloseoutRequirements(job, options);
}

export function evaluateJobCloseoutRequirements(
  requirements: JobCloseoutRequirement[] = [],
): JobCloseoutEvaluationResult {
  const activeRequirements = requirements.filter(isRequirementActive);
  const blockingRequirements = activeRequirements.filter(requirement =>
    requirement.kind === 'required' || requirement.kind === 'conditional',
  );
  const missingRequiredItems = blockingRequirements.filter(requirement => !isRequirementSatisfied(requirement));
  const satisfiedRequiredItems = blockingRequirements.filter(isRequirementSatisfied);
  const activeConditionalRequirements = activeRequirements.filter(requirement => requirement.kind === 'conditional');
  const recommendedItems = activeRequirements.filter(requirement => requirement.kind === 'recommended');
  const referenceItems = activeRequirements.filter(requirement => requirement.kind === 'reference');
  const warnings = recommendedItems.filter(requirement => !isRequirementSatisfied(requirement));

  return {
    satisfiedRequiredItems,
    missingRequiredItems,
    activeConditionalRequirements,
    warnings,
    recommendedItems,
    referenceItems,
    completionAllowed: missingRequiredItems.length === 0,
  };
}

export function evaluateJobCloseout(
  job: Job,
  options: {
    procedureCatalog?: ProcedureCatalog;
    procedureResolution?: ProcedureResolutionResult;
    context?: ProcedureRequirementContext;
  } = {},
): JobCloseoutEvaluationResult {
  return evaluateJobCloseoutRequirements(getJobEffectiveCloseoutRequirements(job, options).requirements);
}
