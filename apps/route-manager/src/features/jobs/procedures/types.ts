import type { JobType } from '../../../types';
import type { JobCloseoutRequirementKind } from '../jobCloseoutTypes';

export type ProcedureStatus = 'draft' | 'active' | 'retired';
export type ProcedureRequirementClassification = JobCloseoutRequirementKind;

export type ProcedureCondition =
  | { type: 'device_type_equals'; deviceType: string }
  | { type: 'job_field_equals'; field: string; value: string | number | boolean | null }
  | { type: 'previous_answer_equals'; stepId: string; answerKey?: string; value: string | number | boolean | null }
  | { type: 'equipment_present'; equipmentRequirementId: string }
  | { type: 'equipment_missing'; equipmentRequirementId: string }
  | { type: 'issue_present'; issueType?: string }
  | { type: 'blocker_present'; blockerType?: string };

export type ProcedureProofType =
  | 'photo'
  | 'video'
  | 'receipt'
  | 'screenshot'
  | 'signature'
  | 'document'
  | 'text_note'
  | 'other';

export type ProcedureVisitScope = 'any_visit' | 'current_visit' | 'per_visit' | 'final_visit';

export interface ProcedureProofRequirement {
  id: string;
  label: string;
  proofType: ProcedureProofType;
  classification: ProcedureRequirementClassification;
  instructions: string;
  visitScope?: ProcedureVisitScope;
  minimumCount?: number;
}

export type ProcedureSerialRequirement = 'none' | 'single' | 'old' | 'new' | 'old_and_new';

export interface ProcedureEquipmentRequirement {
  id: string;
  label: string;
  deviceModel?: string;
  quantity?: number;
  serialRequirement: ProcedureSerialRequirement;
  trackRemovedEquipment?: boolean;
  returnRequired?: boolean;
  classification: ProcedureRequirementClassification;
  visitScope?: ProcedureVisitScope;
}

export type ProcedureValidationType =
  | 'transaction_test'
  | 'connectivity_test'
  | 'visual_verification'
  | 'manager_customer_verification'
  | 'support_verification';

export interface ProcedureTestingRequirement {
  id: string;
  label: string;
  validationType: ProcedureValidationType;
  classification: ProcedureRequirementClassification;
  instructions?: string;
}

export type ProcedureSupportContactType =
  | 'manager'
  | 'customer'
  | 'dispatcher'
  | 'technical_support'
  | 'vendor'
  | 'other';

export interface ProcedureSupportEscalation {
  id: string;
  escalationLabel: string;
  contactRoleType: ProcedureSupportContactType;
  instructions: string;
  referenceNumberRequired?: boolean;
  conditional?: boolean;
  condition?: ProcedureCondition;
}

export interface ProcedureStep {
  id: string;
  phaseId?: string;
  phaseLabel?: string;
  title: string;
  guidedInstructions?: string;
  quickCheckpoint?: string;
  classification: ProcedureRequirementClassification;
  warningText?: string;
  displayOrder: number;
  condition?: ProcedureCondition;
  proofRequirements?: ProcedureProofRequirement[];
  equipmentRequirements?: ProcedureEquipmentRequirement[];
  testingRequirements?: ProcedureTestingRequirement[];
  supportEscalations?: ProcedureSupportEscalation[];
}

export interface ProcedureDefinition {
  id: string;
  customerKey: string;
  companyKey?: string;
  name: string;
  description: string;
  version: string;
  status: ProcedureStatus;
  category: string;
  jobType: JobType;
  createdAt: string;
  updatedAt: string;
  steps: ProcedureStep[];
}

export interface ProcedureVersionReference {
  procedureId: string;
  version: string;
}

export type ProcedureValidationSeverity = 'error' | 'warning';

export interface ProcedureValidationError {
  code: string;
  message: string;
  path: string;
  severity: ProcedureValidationSeverity;
}

export interface ProcedureValidationResult {
  valid: boolean;
  errors: ProcedureValidationError[];
}
