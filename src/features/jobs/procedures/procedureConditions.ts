import type { Job } from '../../../types';
import type { ProcedureCondition } from './types';

export interface ProcedureRequirementContext {
  job?: Job;
  deviceType?: string;
  previousAnswers?: Record<string, unknown>;
  presentEquipmentRequirementIds?: string[];
  missingEquipmentRequirementIds?: string[];
  issueTypes?: string[];
  blockerTypes?: string[];
  satisfiedRequirementIds?: string[];
  requirementSatisfaction?: Record<string, boolean>;
}

export type ProcedureConditionEvaluationStatus =
  | 'active'
  | 'inactive'
  | 'unresolved'
  | 'malformed';

export interface ProcedureConditionEvaluationResult {
  status: ProcedureConditionEvaluationStatus;
  active: boolean;
  reason?: string;
  condition?: ProcedureCondition;
}

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && !(typeof value === 'string' && value.trim().length === 0);

const valuesEqual = (left: unknown, right: unknown) => left === right;

function readPreviousAnswer(
  answers: Record<string, unknown> | undefined,
  stepId: string,
  answerKey: string | undefined,
): unknown {
  if (!answers || !(stepId in answers)) return undefined;
  const stepAnswer = answers[stepId];
  if (!answerKey) return stepAnswer;
  if (stepAnswer && typeof stepAnswer === 'object' && answerKey in stepAnswer) {
    return (stepAnswer as Record<string, unknown>)[answerKey];
  }
  return undefined;
}

function readJobField(job: Job | undefined, field: string): unknown {
  if (!job || !field || field.includes('.') || field.includes('[')) return undefined;
  return (job as unknown as Record<string, unknown>)[field];
}

function includesOptionalValue(values: string[] | undefined, value: string | undefined): boolean | undefined {
  if (!values) return undefined;
  if (!value) return values.length > 0;
  return values.includes(value);
}

export function evaluateProcedureCondition(
  condition: ProcedureCondition | undefined,
  context: ProcedureRequirementContext = {},
): ProcedureConditionEvaluationResult {
  if (!condition) {
    return { status: 'active', active: true, reason: 'No condition.' };
  }

  switch (condition.type) {
    case 'device_type_equals':
      if (!hasValue(condition.deviceType)) return { status: 'malformed', active: false, condition, reason: 'Missing device type.' };
      if (!hasValue(context.deviceType)) return { status: 'unresolved', active: false, condition, reason: 'No device type context.' };
      return {
        status: context.deviceType === condition.deviceType ? 'active' : 'inactive',
        active: context.deviceType === condition.deviceType,
        condition,
      };
    case 'job_field_equals': {
      if (!hasValue(condition.field) || !hasValue(condition.value)) {
        return { status: 'malformed', active: false, condition, reason: 'Missing job field condition data.' };
      }
      const value = readJobField(context.job, condition.field);
      if (value === undefined) return { status: 'unresolved', active: false, condition, reason: 'No matching job field context.' };
      return {
        status: valuesEqual(value, condition.value) ? 'active' : 'inactive',
        active: valuesEqual(value, condition.value),
        condition,
      };
    }
    case 'previous_answer_equals': {
      if (!hasValue(condition.stepId) || !hasValue(condition.value)) {
        return { status: 'malformed', active: false, condition, reason: 'Missing previous answer condition data.' };
      }
      const value = readPreviousAnswer(context.previousAnswers, condition.stepId, condition.answerKey);
      if (value === undefined) return { status: 'unresolved', active: false, condition, reason: 'No previous answer context.' };
      return {
        status: valuesEqual(value, condition.value) ? 'active' : 'inactive',
        active: valuesEqual(value, condition.value),
        condition,
      };
    }
    case 'equipment_present':
      if (!hasValue(condition.equipmentRequirementId)) {
        return { status: 'malformed', active: false, condition, reason: 'Missing equipment requirement ID.' };
      }
      if (!context.presentEquipmentRequirementIds) {
        return { status: 'unresolved', active: false, condition, reason: 'No equipment-present context.' };
      }
      return {
        status: context.presentEquipmentRequirementIds.includes(condition.equipmentRequirementId) ? 'active' : 'inactive',
        active: context.presentEquipmentRequirementIds.includes(condition.equipmentRequirementId),
        condition,
      };
    case 'equipment_missing':
      if (!hasValue(condition.equipmentRequirementId)) {
        return { status: 'malformed', active: false, condition, reason: 'Missing equipment requirement ID.' };
      }
      if (!context.missingEquipmentRequirementIds) {
        return { status: 'unresolved', active: false, condition, reason: 'No equipment-missing context.' };
      }
      return {
        status: context.missingEquipmentRequirementIds.includes(condition.equipmentRequirementId) ? 'active' : 'inactive',
        active: context.missingEquipmentRequirementIds.includes(condition.equipmentRequirementId),
        condition,
      };
    case 'issue_present': {
      const present = includesOptionalValue(context.issueTypes, condition.issueType);
      if (present === undefined) return { status: 'unresolved', active: false, condition, reason: 'No issue context.' };
      return { status: present ? 'active' : 'inactive', active: present, condition };
    }
    case 'blocker_present': {
      const present = includesOptionalValue(context.blockerTypes, condition.blockerType);
      if (present === undefined) return { status: 'unresolved', active: false, condition, reason: 'No blocker context.' };
      return { status: present ? 'active' : 'inactive', active: present, condition };
    }
    default:
      return { status: 'malformed', active: false, condition, reason: 'Unsupported condition type.' };
  }
}
