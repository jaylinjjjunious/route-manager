import { beforeEach, describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import { evaluateJobCloseout } from '../src/features/jobs/jobCloseout';
import { composeProcedureCatalog } from '../src/features/jobs/procedures/procedureCatalog';
import type { ProcedureDefinition, ProcedureEquipmentRequirement } from '../src/features/jobs/procedures/types';
import {
  emptyCustodyLedger,
  recordInventoryForRequirement,
  type CustodyEvent,
  type CustodyItem,
  type CustodyLedger,
  type CustodyRequirementRole,
} from '../src/services/inventory/chainOfCustody';
import {
  evaluateEquipmentRequirement,
  getInventoryForJob,
  getSatisfiedEquipmentRequirementIds,
} from '../src/services/inventory/procedureInventory';
import type { ProofRecord } from '../src/features/proofVault/types';

const assignedAt = '2026-08-15T09:00:00.000Z';
const equipmentRequirementId = 'terminal-serial';
const derivedEquipmentId = `procedure:proc-equipment@1.0.0:equipment:${equipmentRequirementId}`;

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Vons',
    address: '5201 White Ln, Bakersfield, CA',
    pay: 25,
    estimatedMinutes: 30,
    jobType: 'field_task',
    dueTime: '17:00',
    notes: '',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3733, lng: -119.0187 },
    inventoryDomain: 'contract_parts',
    procedureAssignment: {
      procedureId: 'proc-equipment',
      procedureVersion: '1.0.0',
      assignedAt,
      assignmentSource: 'manual',
    },
    ...overrides,
  };
}

function equipmentRequirement(overrides: Partial<ProcedureEquipmentRequirement> = {}): ProcedureEquipmentRequirement {
  return {
    id: equipmentRequirementId,
    label: 'Terminal serial',
    deviceModel: 'Generic terminal',
    quantity: 1,
    serialRequirement: 'none',
    classification: 'required',
    ...overrides,
  };
}

function makeProcedure(options: {
  version?: string;
  stepClassification?: 'required' | 'conditional' | 'recommended' | 'reference';
  equipment?: ProcedureEquipmentRequirement;
} = {}): ProcedureDefinition {
  return {
    id: 'proc-equipment',
    customerKey: 'generic',
    name: 'Equipment Procedure',
    description: 'Generic equipment procedure.',
    version: options.version ?? '1.0.0',
    status: 'active',
    category: 'technician',
    jobType: 'field_task',
    createdAt: '2026-08-15T08:00:00.000Z',
    updatedAt: '2026-08-15T08:00:00.000Z',
    steps: [{
      id: 'equipment-step',
      title: 'Record terminal equipment',
      guidedInstructions: 'Record terminal equipment.',
      quickCheckpoint: 'Equipment',
      classification: options.stepClassification ?? 'reference',
      condition: options.stepClassification === 'conditional'
        ? { type: 'device_type_equals', deviceType: 'pin-pad' }
        : undefined,
      displayOrder: 1,
      equipmentRequirements: [options.equipment ?? equipmentRequirement()],
    }],
  };
}

function matchingIdentity(overrides: {
  requirementId?: string;
  procedureVersion?: string;
  procedureStepId?: string;
  visitId?: string;
  requirementRole?: CustodyRequirementRole;
} = {}) {
  return {
    requirementId: overrides.requirementId ?? equipmentRequirementId,
    procedureId: 'proc-equipment',
    procedureVersion: overrides.procedureVersion ?? '1.0.0',
    procedureStepId: overrides.procedureStepId ?? 'equipment-step',
    visitId: overrides.visitId,
    requirementRole: overrides.requirementRole,
  };
}

function makeEvent(overrides: Partial<CustodyEvent> = {}): CustodyEvent {
  return {
    domain: 'contract_parts',
    integrityVersion: 4,
    id: overrides.id ?? `event-${overrides.type ?? 'receive_in'}-${Math.random().toString(16).slice(2)}`,
    jobId: 'job-1',
    itemId: overrides.itemId ?? 'item-1',
    type: overrides.type ?? 'receive_in',
    occurredAt: overrides.occurredAt ?? '2026-08-15T09:00:00.000Z',
    partNumber: overrides.partNumber ?? 'TERM-1',
    serialNumber: overrides.serialNumber ?? 'SN-1',
    evidenceIds: [],
    previousHash: 'GENESIS',
    hash: 'hash',
    syncStatus: 'queued',
    ...matchingIdentity({ requirementRole: overrides.requirementRole }),
    ...overrides,
  };
}

function makeItem(overrides: Partial<CustodyItem> = {}): CustodyItem {
  return {
    domain: 'contract_parts',
    id: overrides.id ?? 'item-1',
    jobId: 'job-1',
    partNumber: overrides.partNumber ?? 'TERM-1',
    serialNumber: overrides.serialNumber ?? 'SN-1',
    status: overrides.status ?? 'received',
    evidence: [],
    eventIds: [],
    updatedAt: '2026-08-15T09:00:00.000Z',
    ...matchingIdentity({ requirementRole: overrides.requirementRole }),
    ...overrides,
  };
}

function makeLedger(items: CustodyItem[] = [makeItem()], events: CustodyEvent[] = [makeEvent()]): CustodyLedger {
  return {
    version: 1,
    jobId: 'job-1',
    domain: 'contract_parts',
    items,
    events,
  };
}

function evaluateWithInventory(
  procedure: ProcedureDefinition,
  inventoryLedgers: CustodyLedger[] = [],
  job: Job = makeJob(),
  extraContext: Record<string, unknown> = {},
) {
  return evaluateJobCloseout(job, {
    procedureCatalog: composeProcedureCatalog(procedure),
    context: { inventoryLedgers, ...extraContext },
  });
}

describe('procedure inventory closeout integration', () => {
  beforeEach(() => localStorage.clear());

  it('blocks closeout when required equipment is missing', () => {
    const result = evaluateWithInventory(makeProcedure());

    expect(result.completionAllowed).toBe(false);
    expect(result.missingRequiredItems.map(item => item.id)).toContain(derivedEquipmentId);
  });

  it('satisfies equipment with a matching inventory custody record', () => {
    const result = evaluateWithInventory(makeProcedure(), [makeLedger()]);

    expect(result.completionAllowed).toBe(true);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toContain(derivedEquipmentId);
  });

  it('does not satisfy equipment with unrelated inventory', () => {
    const unrelated = makeLedger([makeItem({ requirementId: 'other-requirement' })], [makeEvent({ requirementId: 'other-requirement' })]);

    expect(evaluateWithInventory(makeProcedure(), [unrelated]).completionAllowed).toBe(false);
  });

  it('requires exact procedure version identity', () => {
    const procedure = makeProcedure({ version: '2.0.0' });
    const job = makeJob({
      procedureAssignment: {
        procedureId: 'proc-equipment',
        procedureVersion: '2.0.0',
        assignedAt,
        assignmentSource: 'manual',
      },
    });

    expect(evaluateWithInventory(procedure, [makeLedger()], job).completionAllowed).toBe(false);
  });

  it('satisfies single serial requirement when one serial exists', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ serialRequirement: 'single' }) });

    expect(evaluateWithInventory(procedure, [makeLedger()]).completionAllowed).toBe(true);
  });

  it('satisfies old serial requirement from removed-item custody', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ serialRequirement: 'old', trackRemovedEquipment: true }) });
    const ledger = makeLedger(
      [makeItem({ status: 'removed', serialNumber: 'OLD-1', requirementRole: 'removed_item' })],
      [makeEvent({ type: 'removal', serialNumber: 'OLD-1', requirementRole: 'removed_item' })],
    );

    expect(evaluateWithInventory(procedure, [ledger]).completionAllowed).toBe(true);
  });

  it('satisfies new serial requirement from installed-item custody', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ serialRequirement: 'new' }) });
    const ledger = makeLedger(
      [makeItem({ status: 'installed', serialNumber: 'NEW-1', requirementRole: 'installed_item' })],
      [makeEvent({ type: 'install', serialNumber: 'NEW-1', requirementRole: 'installed_item' })],
    );

    expect(evaluateWithInventory(procedure, [ledger]).completionAllowed).toBe(true);
  });

  it('requires distinct old and new serial roles for old_and_new', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ serialRequirement: 'old_and_new', trackRemovedEquipment: true }) });
    const duplicateSerialLedger = makeLedger(
      [makeItem({ status: 'removed', serialNumber: 'SAME', requirementRole: 'removed_item' })],
      [
        makeEvent({ id: 'install', type: 'install', serialNumber: 'SAME', requirementRole: 'installed_item' }),
        makeEvent({ id: 'remove', type: 'removal', serialNumber: 'SAME', requirementRole: 'removed_item' }),
      ],
    );
    const distinctSerialLedger = makeLedger(
      [makeItem({ status: 'removed', serialNumber: 'OLD-1', requirementRole: 'removed_item' })],
      [
        makeEvent({ id: 'install', type: 'install', serialNumber: 'NEW-1', requirementRole: 'installed_item' }),
        makeEvent({ id: 'remove', type: 'removal', serialNumber: 'OLD-1', requirementRole: 'removed_item' }),
      ],
    );

    expect(evaluateWithInventory(procedure, [duplicateSerialLedger]).completionAllowed).toBe(false);
    expect(evaluateWithInventory(procedure, [distinctSerialLedger]).completionAllowed).toBe(true);
  });

  it('requires actual removed-equipment custody data when tracking is required', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ trackRemovedEquipment: true }) });
    const installedOnly = makeLedger(
      [makeItem({ status: 'installed', requirementRole: 'installed_item' })],
      [makeEvent({ type: 'install', requirementRole: 'installed_item' })],
    );
    const removed = makeLedger(
      [makeItem({ status: 'removed', requirementRole: 'removed_item' })],
      [makeEvent({ type: 'removal', requirementRole: 'removed_item' })],
    );

    expect(evaluateWithInventory(procedure, [installedOnly]).completionAllowed).toBe(false);
    expect(evaluateWithInventory(procedure, [removed]).completionAllowed).toBe(true);
  });

  it('keeps removed equipment unsatisfied when required old serial is missing', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ trackRemovedEquipment: true, serialRequirement: 'old' }) });
    const ledger = makeLedger(
      [makeItem({ status: 'removed', serialNumber: '', requirementRole: 'removed_item' })],
      [makeEvent({ type: 'removal', serialNumber: '', requirementRole: 'removed_item' })],
    );

    expect(evaluateWithInventory(procedure, [ledger]).completionAllowed).toBe(false);
  });

  it('does not satisfy return-required after removal only', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ trackRemovedEquipment: true, returnRequired: true }) });
    const ledger = makeLedger(
      [makeItem({ status: 'removed', requirementRole: 'removed_item' })],
      [makeEvent({ type: 'removal', requirementRole: 'removed_item' })],
    );

    expect(evaluateWithInventory(procedure, [ledger]).completionAllowed).toBe(false);
  });

  it('satisfies return-required with completed return receipt and tracking', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ trackRemovedEquipment: true, returnRequired: true }) });
    const ledger = makeLedger(
      [makeItem({ status: 'returned', requirementRole: 'return_item' })],
      [
        makeEvent({ id: 'remove', type: 'removal', requirementRole: 'removed_item' }),
        makeEvent({ id: 'return', type: 'return', requirementRole: 'return_item', receiptNumber: 'RCPT-1', trackingNumber: 'TRACK-1' }),
      ],
    );

    expect(evaluateWithInventory(procedure, [ledger]).completionAllowed).toBe(true);
  });

  it('respects quantity greater than one', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ quantity: 2 }) });
    const one = makeLedger([makeItem({ id: 'item-1' })], [makeEvent({ itemId: 'item-1' })]);
    const two = makeLedger(
      [makeItem({ id: 'item-1' }), makeItem({ id: 'item-2', serialNumber: 'SN-2' })],
      [makeEvent({ itemId: 'item-1' }), makeEvent({ itemId: 'item-2', serialNumber: 'SN-2' })],
    );

    expect(evaluateWithInventory(procedure, [one]).completionAllowed).toBe(false);
    expect(evaluateWithInventory(procedure, [two]).completionAllowed).toBe(true);
  });

  it('keeps visit 1 inventory from satisfying a visit 2 scoped requirement', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ visitScope: 'current_visit' }) });
    const job = makeJob({ lifecycle: {
      schemaVersion: 1,
      status: 'in_progress',
      workState: 'working',
      activeVisitId: 'visit-2',
      visits: [
        { id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' },
        { id: 'visit-2', visitNumber: 2, arrivedAt: '2026-08-16T09:00:00.000Z' },
      ],
      events: [],
    } });

    expect(evaluateWithInventory(procedure, [makeLedger([makeItem({ visitId: 'visit-1' })], [makeEvent({ visitId: 'visit-1' })])], job).completionAllowed).toBe(false);
    expect(evaluateWithInventory(procedure, [makeLedger([makeItem({ visitId: 'visit-2' })], [makeEvent({ visitId: 'visit-2' })])], job).completionAllowed).toBe(true);
  });

  it('blocks active conditional missing equipment', () => {
    const procedure = makeProcedure({ stepClassification: 'conditional' });

    expect(evaluateWithInventory(procedure, [], makeJob(), { deviceType: 'pin-pad' }).completionAllowed).toBe(false);
  });

  it('does not block inactive conditional equipment', () => {
    const procedure = makeProcedure({ stepClassification: 'conditional' });

    expect(evaluateWithInventory(procedure, [], makeJob(), { deviceType: 'terminal' }).completionAllowed).toBe(true);
  });

  it('keeps recommended equipment non-blocking', () => {
    const procedure = makeProcedure({ equipment: equipmentRequirement({ classification: 'recommended' }) });
    const result = evaluateWithInventory(procedure);

    expect(result.completionAllowed).toBe(true);
    expect(result.recommendedItems.map(item => item.id)).toContain(derivedEquipmentId);
  });

  it('stamps requirement identity on procedure-driven inventory updates', async () => {
    const ledger = await recordInventoryForRequirement({
      ledger: emptyCustodyLedger('job-1', 'contract_parts'),
      type: 'receive_in',
      partNumber: 'TERM-1',
      serialNumber: 'SN-1',
      requirementContext: {
        requirementId: equipmentRequirementId,
        procedureId: 'proc-equipment',
        procedureVersion: '1.0.0',
        procedureStepId: 'equipment-step',
        visitId: 'visit-1',
        requirementRole: 'installed_item',
      },
    });

    expect(ledger.items[0]).toMatchObject({
      requirementId: equipmentRequirementId,
      procedureId: 'proc-equipment',
      procedureVersion: '1.0.0',
      procedureStepId: 'equipment-step',
      visitId: 'visit-1',
      requirementRole: 'installed_item',
    });
    expect(ledger.events[0]).toMatchObject({
      requirementId: equipmentRequirementId,
      procedureId: 'proc-equipment',
      procedureVersion: '1.0.0',
      procedureStepId: 'equipment-step',
      visitId: 'visit-1',
      requirementRole: 'installed_item',
    });
  });

  it('keeps legacy inventory readable without satisfying procedure requirements by fuzzy matching', () => {
    const legacy = makeLedger([
      { ...makeItem(), requirementId: undefined, procedureId: undefined, procedureVersion: undefined, procedureStepId: undefined },
    ], [
      { ...makeEvent(), requirementId: undefined, procedureId: undefined, procedureVersion: undefined, procedureStepId: undefined },
    ]);

    expect(getInventoryForJob([legacy], 'job-1')).not.toHaveLength(0);
    expect(evaluateWithInventory(makeProcedure(), [legacy]).completionAllowed).toBe(false);
  });

  it('keeps legacy jobs with no procedure unchanged', () => {
    const result = evaluateJobCloseout(makeJob({
      procedureAssignment: undefined,
      closeoutRequirements: [{ id: 'manual', kind: 'required', label: 'Manual', satisfied: true }],
    }), {
      procedureCatalog: composeProcedureCatalog(makeProcedure()),
      context: { inventoryLedgers: [makeLedger()] },
    });

    expect(result.completionAllowed).toBe(true);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toEqual(['manual']);
  });

  it('is idempotent across repeated evaluation', () => {
    const procedure = makeProcedure();
    const ledgers = [makeLedger()];

    expect(evaluateWithInventory(procedure, ledgers)).toEqual(evaluateWithInventory(procedure, ledgers));
  });

  it('preserves unresolved procedure blocking', () => {
    const result = evaluateJobCloseout(makeJob(), {
      procedureCatalog: [],
      context: { inventoryLedgers: [makeLedger()] },
    });

    expect(result.completionAllowed).toBe(false);
    expect(result.missingRequiredItems.map(item => item.id)).toContain('procedure-unresolved:proc-equipment@1.0.0');
  });

  it('keeps proof-backed requirements working when inventory context is also present', () => {
    const proofProcedure: ProcedureDefinition = {
      ...makeProcedure(),
      steps: [{
        id: 'proof-step',
        title: 'Capture proof',
        guidedInstructions: 'Capture proof.',
        quickCheckpoint: 'Proof',
        classification: 'reference',
        displayOrder: 1,
        proofRequirements: [{
          id: 'arrival-photo',
          label: 'Arrival photo',
          proofType: 'photo',
          classification: 'required',
          instructions: 'Capture proof.',
        }],
      }],
    };
    const proofRecord: ProofRecord = {
      jobId: 'job-1',
      storeName: 'Vons',
      address: '5201 White Ln',
      completionTime: '2026-08-15T10:00:00.000Z',
      arrivalTime: '2026-08-15T09:00:00.000Z',
      photos: [{
        id: 'proof-1',
        name: 'proof.jpg',
        dataUrl: 'data:image/jpeg;base64,abc',
        addedAt: '2026-08-15T09:00:00.000Z',
        source: 'procedure_requirement',
        proofType: 'photo',
        requirementId: 'arrival-photo',
        procedureId: 'proc-equipment',
        procedureVersion: '1.0.0',
        procedureStepId: 'proof-step',
      }],
      screenshots: [],
      receipts: [],
      notes: '',
      createdAt: '2026-08-15T10:00:00.000Z',
      updatedAt: '2026-08-15T10:00:00.000Z',
    };

    const result = evaluateJobCloseout(makeJob(), {
      procedureCatalog: composeProcedureCatalog(proofProcedure),
      context: { inventoryLedgers: [makeLedger()], proofRecords: [proofRecord] },
    });

    expect(result.completionAllowed).toBe(true);
  });
});

describe('procedure inventory helper details', () => {
  it('reports equipment evaluation details and satisfied IDs', () => {
    const procedure = makeProcedure();
    const inventory = getInventoryForJob([makeLedger()], 'job-1');
    const requirement = procedure.steps[0].equipmentRequirements?.[0] as ProcedureEquipmentRequirement;

    expect(evaluateEquipmentRequirement(inventory, procedure, procedure.steps[0], requirement)).toMatchObject({
      satisfied: true,
      requiredQuantity: 1,
      matchingQuantity: 1,
      matchingItemIds: ['item-1'],
    });
    expect(getSatisfiedEquipmentRequirementIds(inventory, procedure)).toEqual([equipmentRequirementId]);
  });
});
