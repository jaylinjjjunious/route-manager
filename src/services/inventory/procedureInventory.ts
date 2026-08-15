import type { Job } from '../../types';
import type { ProcedureDefinition, ProcedureEquipmentRequirement, ProcedureStep } from '../../features/jobs/procedures/types';
import type { CustodyEvent, CustodyItem, CustodyLedger, CustodyRequirementRole } from './chainOfCustody';

export interface InventoryEvidence {
  jobId: string;
  item: CustodyItem;
  event?: CustodyEvent;
  status: CustodyItem['status'];
  serialNumber?: string;
  role?: CustodyRequirementRole;
  visitId?: string;
  receiptNumber?: string;
  trackingNumber?: string;
}

export interface EquipmentRequirementEvaluationContext {
  job?: Job;
  visitId?: string;
  requiredVisitIds?: string[];
}

export interface EquipmentRequirementEvaluationResult {
  requirementId: string;
  satisfied: boolean;
  requiredQuantity: number;
  matchingQuantity: number;
  matchingItemIds: string[];
  matchingEventIds: string[];
  visitIdsChecked?: string[];
  reason?: string;
}

const roleByEventType: Record<CustodyEvent['type'], CustodyRequirementRole> = {
  receive_in: 'assigned_item',
  install: 'installed_item',
  removal: 'removed_item',
  return: 'return_item',
};

function exactIdentityMatches(
  evidence: InventoryEvidence,
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureEquipmentRequirement,
): boolean {
  return evidence.item.requirementId === requirement.id
    && evidence.item.procedureId === procedure.id
    && evidence.item.procedureVersion === procedure.version
    && evidence.item.procedureStepId === step.id;
}

function eventIdentityMatches(
  evidence: InventoryEvidence,
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureEquipmentRequirement,
): boolean {
  if (!evidence.event) return false;
  return evidence.event.requirementId === requirement.id
    && evidence.event.procedureId === procedure.id
    && evidence.event.procedureVersion === procedure.version
    && evidence.event.procedureStepId === step.id;
}

function identityMatches(
  evidence: InventoryEvidence,
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureEquipmentRequirement,
): boolean {
  return exactIdentityMatches(evidence, procedure, step, requirement)
    || eventIdentityMatches(evidence, procedure, step, requirement);
}

export function getInventoryForJob(
  ledgers: CustodyLedger[] | Record<string, CustodyLedger> | undefined,
  jobId: string,
): InventoryEvidence[] {
  if (!ledgers) return [];
  const ledgerList = Array.isArray(ledgers) ? ledgers : Object.values(ledgers);
  return ledgerList
    .filter(ledger => ledger.jobId === jobId)
    .flatMap(ledger => ledger.items.flatMap(item => {
      const itemEvents = ledger.events.filter(event => event.itemId === item.id);
      const itemEvidence: InventoryEvidence = {
        jobId,
        item,
        status: item.status,
        serialNumber: item.serialNumber,
        role: item.requirementRole,
        visitId: item.visitId,
      };
      return [
        itemEvidence,
        ...itemEvents.map(event => ({
          jobId,
          item,
          event,
          status: event.type === 'receive_in' ? 'received' as const : event.type === 'install' ? 'installed' as const : event.type === 'removal' ? 'removed' as const : 'returned' as const,
          serialNumber: event.serialNumber,
          role: event.requirementRole ?? roleByEventType[event.type],
          visitId: event.visitId ?? item.visitId,
          receiptNumber: event.receiptNumber,
          trackingNumber: event.trackingNumber,
        })),
      ];
    }));
}

function currentVisitId(context: EquipmentRequirementEvaluationContext): string | undefined {
  return context.visitId ?? context.job?.lifecycle?.activeVisitId;
}

function finalVisitId(job: Job | undefined): string | undefined {
  return job?.lifecycle?.visits.at(-1)?.id;
}

function visitIdsForRequirement(
  requirement: ProcedureEquipmentRequirement,
  context: EquipmentRequirementEvaluationContext,
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

function hasSerial(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function roleSerials(evidence: InventoryEvidence[], roles: CustodyRequirementRole[]): string[] {
  return evidence
    .filter(entry => roles.includes(entry.role as CustodyRequirementRole))
    .map(entry => entry.serialNumber?.trim())
    .filter((serial): serial is string => Boolean(serial));
}

function serialRequirementSatisfied(requirement: ProcedureEquipmentRequirement, evidence: InventoryEvidence[]): boolean {
  switch (requirement.serialRequirement) {
    case 'none':
      return true;
    case 'single':
      return evidence.some(entry => hasSerial(entry.serialNumber));
    case 'old':
      return roleSerials(evidence, ['removed_item']).length > 0;
    case 'new':
      return roleSerials(evidence, ['installed_item', 'assigned_item']).length > 0;
    case 'old_and_new': {
      const oldSerials = roleSerials(evidence, ['removed_item']);
      const newSerials = roleSerials(evidence, ['installed_item', 'assigned_item']);
      return oldSerials.some(oldSerial => newSerials.some(newSerial => newSerial !== oldSerial));
    }
  }
}

function removalSatisfied(requirement: ProcedureEquipmentRequirement, evidence: InventoryEvidence[]): boolean {
  if (!requirement.trackRemovedEquipment) return true;
  return evidence.some(entry => entry.role === 'removed_item' || entry.status === 'removed' || entry.status === 'returned');
}

function returnSatisfied(requirement: ProcedureEquipmentRequirement, evidence: InventoryEvidence[]): boolean {
  if (!requirement.returnRequired) return true;
  return evidence.some(entry =>
    (entry.role === 'return_item' || entry.status === 'returned')
    && Boolean(entry.receiptNumber?.trim())
    && Boolean(entry.trackingNumber?.trim()),
  );
}

function quantitySatisfied(requirement: ProcedureEquipmentRequirement, evidence: InventoryEvidence[]): boolean {
  const requiredQuantity = requirement.quantity ?? 1;
  const itemIds = new Set(evidence.map(entry => entry.item.id));
  return itemIds.size >= requiredQuantity;
}

export function doesInventorySatisfyEquipmentRequirement(
  evidence: InventoryEvidence,
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureEquipmentRequirement,
  context: EquipmentRequirementEvaluationContext = {},
): boolean {
  if (!identityMatches(evidence, procedure, step, requirement)) return false;
  const visitIds = visitIdsForRequirement(requirement, context);
  if (visitIds === undefined) return true;
  if (visitIds.length === 0) return false;
  return Boolean(evidence.visitId && visitIds.includes(evidence.visitId));
}

export function evaluateEquipmentRequirement(
  inventory: InventoryEvidence[],
  procedure: Pick<ProcedureDefinition, 'id' | 'version'>,
  step: Pick<ProcedureStep, 'id'>,
  requirement: ProcedureEquipmentRequirement,
  context: EquipmentRequirementEvaluationContext = {},
): EquipmentRequirementEvaluationResult {
  const visitIds = visitIdsForRequirement(requirement, context);
  const matching = inventory.filter(entry =>
    doesInventorySatisfyEquipmentRequirement(entry, procedure, step, requirement, context),
  );
  const matchingItemIds = [...new Set(matching.map(entry => entry.item.id))].sort();
  const matchingEventIds = [...new Set(matching.map(entry => entry.event?.id).filter((id): id is string => Boolean(id)))].sort();
  const requiredQuantity = requirement.quantity ?? 1;

  const satisfied = matching.length > 0
    && quantitySatisfied(requirement, matching)
    && serialRequirementSatisfied(requirement, matching)
    && removalSatisfied(requirement, matching)
    && returnSatisfied(requirement, matching);

  return {
    requirementId: requirement.id,
    satisfied,
    requiredQuantity,
    matchingQuantity: matchingItemIds.length,
    matchingItemIds,
    matchingEventIds,
    visitIdsChecked: visitIds,
    reason: satisfied ? undefined : 'Matching inventory custody records do not satisfy quantity, serial, removal, or return requirements.',
  };
}

export function getSatisfiedEquipmentRequirementIds(
  inventory: InventoryEvidence[],
  procedure: ProcedureDefinition,
  context: EquipmentRequirementEvaluationContext = {},
): string[] {
  return procedure.steps.flatMap(step =>
    (step.equipmentRequirements ?? [])
      .filter(requirement => evaluateEquipmentRequirement(inventory, procedure, step, requirement, context).satisfied)
      .map(requirement => requirement.id),
  ).sort();
}
