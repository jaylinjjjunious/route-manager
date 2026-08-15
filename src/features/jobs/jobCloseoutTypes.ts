export type JobCloseoutRequirementKind = 'required' | 'conditional' | 'recommended' | 'reference';

export interface JobCloseoutRequirement {
  id: string;
  label: string;
  kind: JobCloseoutRequirementKind;
  description?: string;
  satisfied?: boolean;
  active?: boolean;
}

export interface JobCloseoutEvaluationResult {
  satisfiedRequiredItems: JobCloseoutRequirement[];
  missingRequiredItems: JobCloseoutRequirement[];
  activeConditionalRequirements: JobCloseoutRequirement[];
  warnings: JobCloseoutRequirement[];
  recommendedItems: JobCloseoutRequirement[];
  referenceItems: JobCloseoutRequirement[];
  completionAllowed: boolean;
}
