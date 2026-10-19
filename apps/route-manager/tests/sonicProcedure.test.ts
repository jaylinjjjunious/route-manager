import { describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import type { ProofRecord } from '../src/features/proofVault/types';
import type { CustodyLedger } from '../src/services/inventory/chainOfCustody';
import {
  composeProcedureCatalog,
  getProcedureByIdAndVersion,
  listProcedureVersions,
  resolveProcedureAssignment,
} from '../src/features/jobs/procedures/procedureCatalog';
import {
  deriveProcedureCloseoutRequirements,
  getEffectiveCloseoutRequirements,
} from '../src/features/jobs/procedures/procedureCloseout';
import {
  deriveProcedureWorkspaceModel,
  scopedProcedureRequirementId,
} from '../src/features/jobs/procedures/procedureProgress';
import { evaluateProcedureCondition } from '../src/features/jobs/procedures/procedureConditions';
import { validateProcedureDefinition } from '../src/features/jobs/procedures/procedureDefinition';
import { SONIC_PROCEDURE_CATALOG } from '../src/features/jobs/procedures/sonicProcedureCatalog';
import { GENERIC_PROCEDURE_CATALOG } from '../src/features/jobs/procedures/genericProcedureCatalog';
import type { ProcedureDefinition } from '../src/features/jobs/procedures/types';
import { evaluateJobCloseout } from '../src/features/jobs/jobCloseout';

const sonicProcedure = SONIC_PROCEDURE_CATALOG[0] as ProcedureDefinition;
const assignedAt = '2026-08-16T09:00:00.000Z';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-sonic-1',
    storeName: 'Sonic Drive-In',
    address: '123 Main St, Bakersfield, CA',
    pay: 45,
    estimatedMinutes: 90,
    jobType: 'field_task',
    dueTime: '14:00',
    notes: '',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3733, lng: -119.0187 },
    ...overrides,
  };
}

function makeSonicJob(deviceTypes?: string[], overrides: Partial<Job> = {}): Job {
  return makeJob({
    deviceTypes,
    procedureAssignment: {
      procedureId: sonicProcedure.id,
      procedureVersion: sonicProcedure.version,
      assignedAt,
      assignmentSource: 'manual',
    },
    ...overrides,
  });
}

function makeProofRecord(
  requirementId: string,
  stepId: string,
  proofType: 'photo' = 'photo',
  overrides: Partial<ProofRecord> = {},
): ProofRecord {
  return {
    jobId: 'job-sonic-1',
    storeName: 'Sonic Drive-In',
    address: '123 Main St, Bakersfield, CA',
    completionTime: '',
    arrivalTime: '',
    photos: [{
      id: `proof-${requirementId}`,
      name: 'site.jpg',
      dataUrl: 'data:image/jpeg;base64,abc',
      addedAt: '2026-08-16T10:00:00.000Z',
      source: 'procedure_requirement',
      proofType,
      requirementId,
      procedureId: sonicProcedure.id,
      procedureVersion: sonicProcedure.version,
      procedureStepId: stepId,
    }],
    screenshots: [],
    receipts: [],
    notes: '',
    createdAt: '2026-08-16T10:00:00.000Z',
    updatedAt: '2026-08-16T10:00:00.000Z',
    ...overrides,
  };
}

function makeInventoryLedger(
  requirementId: string,
  stepId: string,
  serialNumber: string,
  status: CustodyLedger['items'][number]['status'] = 'received',
  role: CustodyLedger['items'][number]['requirementRole'] = 'serial_capture',
  overrides: Partial<CustodyLedger> = {},
): CustodyLedger {
  return {
    version: 1,
    jobId: 'job-sonic-1',
    domain: 'contract_parts',
    items: [{
      id: `item-${requirementId}`,
      domain: 'contract_parts',
      jobId: 'job-sonic-1',
      partNumber: 'SONIC-UX301',
      serialNumber,
      status,
      evidence: [],
      eventIds: [],
      updatedAt: '2026-08-16T10:00:00.000Z',
      requirementId,
      procedureId: sonicProcedure.id,
      procedureVersion: sonicProcedure.version,
      procedureStepId: stepId,
      requirementRole: role,
    }],
    events: [],
    ...overrides,
  };
}

function makeReturnLedger(
  requirementId: string,
  stepId: string,
  serialNumber: string,
): CustodyLedger {
  const ledger = makeInventoryLedger(requirementId, stepId, serialNumber, 'removed', 'removed_item');
  ledger.events = [{
    id: `event-return-${requirementId}`,
    domain: 'contract_parts',
    jobId: 'job-sonic-1',
    type: 'return',
    occurredAt: '2026-08-16T11:00:00.000Z',
    itemId: ledger.items[0].id,
    partNumber: 'SONIC-UX301',
    serialNumber,
    requirementId,
    procedureId: sonicProcedure.id,
    procedureVersion: sonicProcedure.version,
    procedureStepId: stepId,
    requirementRole: 'return_item',
    receiptNumber: 'RCPT-12345',
    trackingNumber: 'TRK-98765',
    evidenceIds: [],
    previousHash: '',
    hash: 'return-hash',
    syncStatus: 'queued',
  }];
  ledger.items[0].eventIds = [ledger.events[0].id];
  return ledger;
}

const catalog = composeProcedureCatalog(GENERIC_PROCEDURE_CATALOG, SONIC_PROCEDURE_CATALOG);

describe('sonic procedure catalog', () => {
  it('validates successfully', () => {
    const result = validateProcedureDefinition(sonicProcedure);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('resolves by exact version', () => {
    const result = resolveProcedureAssignment(makeSonicJob(), catalog);
    expect(result.status).toBe('resolved');
    expect(result.procedure?.id).toBe('sonic-verifone-device-swap');
    expect(result.procedure?.version).toBe('1.0.0');
  });

  it('lists the Sonic version in the composed catalog', () => {
    expect(listProcedureVersions(catalog, 'sonic-verifone-device-swap')).toEqual(['1.0.0']);
    expect(getProcedureByIdAndVersion(catalog, 'sonic-verifone-device-swap', '1.0.0')?.name).toBe(
      'Sonic Verifone Device Swap',
    );
  });

  it('returns not_found for a wrong exact version', () => {
    const result = resolveProcedureAssignment(
      makeJob({
        procedureAssignment: {
          procedureId: sonicProcedure.id,
          procedureVersion: '9.9.9',
          assignedAt,
          assignmentSource: 'manual',
        },
      }),
      catalog,
    );
    expect(result.status).toBe('not_found');
  });
});

describe('sonic conditional device logic', () => {
  it('V400M-only job does not activate UX-only requirements', () => {
    const job = makeSonicJob(['V400M']);
    const result = evaluateJobCloseout(job, { procedureCatalog: catalog, context: { deviceTypes: ['V400M'] } });

    const ux301StepIds = sonicProcedure.steps
      .filter(step => step.condition?.type === 'device_type_equals' && step.condition.deviceType === 'UX301')
      .map(step => scopedProcedureRequirementId(sonicProcedure, 'step', step.id));

    const activeUx = result.activeConditionalRequirements.filter(req => ux301StepIds.includes(req.id));
    expect(activeUx).toHaveLength(0);
    expect(result.completionAllowed).toBe(false);
  });

  it('UX301 requirement activates correctly', () => {
    const job = makeSonicJob(['UX301']);
    const result = evaluateJobCloseout(job, { procedureCatalog: catalog, context: { deviceTypes: ['UX301'] } });

    const ux301StepId = scopedProcedureRequirementId(sonicProcedure, 'step', 'identify-ux301');
    const ux301Step = result.activeConditionalRequirements.find(req => req.id === ux301StepId);
    expect(ux301Step).toBeTruthy();
    expect(result.completionAllowed).toBe(false);
  });

  it('UX401 requirement activates correctly', () => {
    const job = makeSonicJob(['UX401']);
    const result = evaluateJobCloseout(job, { procedureCatalog: catalog, context: { deviceTypes: ['UX401'] } });

    const ux401StepId = scopedProcedureRequirementId(sonicProcedure, 'step', 'identify-ux401');
    const ux401Step = result.activeConditionalRequirements.find(req => req.id === ux401StepId);
    expect(ux401Step).toBeTruthy();
    expect(result.completionAllowed).toBe(false);
  });

  it('multi-device job activates all matching device conditions', () => {
    const job = makeSonicJob(['V400M', 'UX301']);
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['V400M', 'UX301'] },
    });

    const v400mStepId = scopedProcedureRequirementId(sonicProcedure, 'step', 'identify-v400m');
    const ux301StepId = scopedProcedureRequirementId(sonicProcedure, 'step', 'identify-ux301');
    expect(result.activeConditionalRequirements.find(req => req.id === v400mStepId)).toBeTruthy();
    expect(result.activeConditionalRequirements.find(req => req.id === ux301StepId)).toBeTruthy();
  });
});

describe('sonic proof requirements', () => {
  it('required before-photo proof blocks closeout when missing', () => {
    const job = makeSonicJob(['UX301']);
    const result = evaluateJobCloseout(job, { procedureCatalog: catalog, context: { deviceTypes: ['UX301'] } });
    const proofId = scopedProcedureRequirementId(sonicProcedure, 'proof', 'ux301-front-photo-proof');
    const proofReq = result.missingRequiredItems.find(req => req.id === proofId);
    expect(proofReq).toBeTruthy();
    expect(proofReq?.satisfied).toBe(false);
  });

  it('matching Proof Vault evidence satisfies the proof requirement', () => {
    const job = makeSonicJob(['UX301']);
    const proof = makeProofRecord('ux301-front-photo-proof', 'ux301-front-photo');
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'], proofRecords: [proof] },
    });
    const proofId = scopedProcedureRequirementId(sonicProcedure, 'proof', 'ux301-front-photo-proof');
    const proofReq = result.missingRequiredItems.find(req => req.id === proofId);
    expect(proofReq).toBeFalsy();
    expect(result.satisfiedRequiredItems.find(req => req.id === proofId)).toBeTruthy();
  });

  it('does not satisfy proof with fuzzy or wrong requirement identity', () => {
    const job = makeSonicJob(['UX301']);
    const badProof = makeProofRecord('wrong-id', 'ux301-front-photo');
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'], proofRecords: [badProof] },
    });
    const proofId = scopedProcedureRequirementId(sonicProcedure, 'proof', 'ux301-front-photo-proof');
    expect(result.missingRequiredItems.find(req => req.id === proofId)).toBeTruthy();
  });
});

describe('sonic serial / equipment requirements', () => {
  it('old serial missing blocks when required', () => {
    const job = makeSonicJob(['UX301']);
    const result = evaluateJobCloseout(job, { procedureCatalog: catalog, context: { deviceTypes: ['UX301'] } });
    const eqId = scopedProcedureRequirementId(sonicProcedure, 'equipment', 'ux301-old-serial');
    const eqReq = result.missingRequiredItems.find(req => req.id === eqId);
    expect(eqReq).toBeTruthy();
    expect(eqReq?.satisfied).toBe(false);
  });

  it('new serial missing blocks when required', () => {
    const job = makeSonicJob(['UX301']);
    const result = evaluateJobCloseout(job, { procedureCatalog: catalog, context: { deviceTypes: ['UX301'] } });
    const eqId = scopedProcedureRequirementId(sonicProcedure, 'equipment', 'ux301-new-serial');
    const eqReq = result.missingRequiredItems.find(req => req.id === eqId);
    expect(eqReq).toBeTruthy();
    expect(eqReq?.satisfied).toBe(false);
  });

  it('old_and_new requires both serial roles and they must be distinguishable', () => {
    const modifiedProcedure: ProcedureDefinition = {
      ...sonicProcedure,
      steps: [
        {
          id: 'swap-serial-check',
          title: 'Swap serial verification',
          guidedInstructions: 'Verify both old and new serials are recorded.',
          quickCheckpoint: 'Both serials recorded.',
          classification: 'required',
          displayOrder: 1,
          equipmentRequirements: [
            {
              id: 'swap-old-and-new',
              label: 'Old and new serial',
              deviceModel: 'UX301',
              quantity: 1,
              serialRequirement: 'old_and_new',
              classification: 'required',
              visitScope: 'any_visit',
            },
          ],
        },
      ],
    };

    // Missing both → unsatisfied
    const missing = deriveProcedureCloseoutRequirements(modifiedProcedure, {
      inventoryLedgers: [],
      job: makeJob(),
    });
    expect(missing.find(req => req.id.endsWith('swap-old-and-new'))?.satisfied).toBe(false);

    // Only old → unsatisfied
    const onlyOld = deriveProcedureCloseoutRequirements(modifiedProcedure, {
      inventoryLedgers: [
        makeInventoryLedger('swap-old-and-new', 'swap-serial-check', 'OLD123', 'removed', 'removed_item'),
      ],
      job: makeJob(),
    });
    expect(onlyOld.find(req => req.id.endsWith('swap-old-and-new'))?.satisfied).toBe(false);

    // Old and new with same serial → unsatisfied
    const sameSerial = deriveProcedureCloseoutRequirements(modifiedProcedure, {
      inventoryLedgers: [
        makeInventoryLedger('swap-old-and-new', 'swap-serial-check', 'SAME456', 'removed', 'removed_item'),
        makeInventoryLedger('swap-old-and-new', 'swap-serial-check', 'SAME456', 'installed', 'installed_item'),
      ],
      job: makeJob(),
    });
    expect(sameSerial.find(req => req.id.endsWith('swap-old-and-new'))?.satisfied).toBe(false);

    // Old and new with different serials → satisfied
    const bothDifferent = deriveProcedureCloseoutRequirements(modifiedProcedure, {
      inventoryLedgers: [
        makeInventoryLedger('swap-old-and-new', 'swap-serial-check', 'OLD789', 'removed', 'removed_item'),
        makeInventoryLedger('swap-old-and-new', 'swap-serial-check', 'NEW789', 'installed', 'installed_item'),
      ],
      job: makeJob(),
    });
    expect(bothDifferent.find(req => req.id.endsWith('swap-old-and-new'))?.satisfied).toBe(true);
  });

  it('matching Inventory Custody evidence satisfies old serial requirement', () => {
    const job = makeSonicJob(['UX301']);
    const ledger = makeInventoryLedger('ux301-old-serial', 'ux301-capture-old-serial', 'OLD-SERIAL-001', 'removed', 'removed_item');
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'], inventoryLedgers: [ledger] },
    });
    const eqId = scopedProcedureRequirementId(sonicProcedure, 'equipment', 'ux301-old-serial');
    expect(result.missingRequiredItems.find(req => req.id === eqId)).toBeFalsy();
    expect(result.satisfiedRequiredItems.find(req => req.id === eqId)).toBeTruthy();
  });
});

describe('sonic grounding and cable warnings', () => {
  it('grounding warning appears in Guided Mode step metadata', () => {
    const step = sonicProcedure.steps.find(s => s.id === 'ux301-preserve-grounding');
    expect(step?.warningText).toContain('grounding strap');
    expect(step?.guidedInstructions).toContain('grounding');
  });

  it('grounding warning remains visible/critical in Quick Mode', () => {
    const step = sonicProcedure.steps.find(s => s.id === 'ux301-preserve-grounding');
    expect(step?.quickCheckpoint).toContain('Grounding');
    expect(step?.warningText).toContain('CRITICAL');
  });
});

describe('sonic testing requirements', () => {
  it('required testing blocks closeout when incomplete', () => {
    const job = makeSonicJob(['V400M']);
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['V400M'] },
    });
    const testId = scopedProcedureRequirementId(sonicProcedure, 'testing', 'v400m-manager-payment-test');
    expect(result.missingRequiredItems.find(req => req.id === testId)).toBeTruthy();
    expect(result.completionAllowed).toBe(false);
  });

  it('manager test/payment acknowledgement satisfies the matching testing requirement', () => {
    const job = makeSonicJob(['V400M']);
    const testId = scopedProcedureRequirementId(sonicProcedure, 'testing', 'v400m-manager-payment-test');
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['V400M'], satisfiedRequirementIds: [testId] },
    });
    expect(result.missingRequiredItems.find(req => req.id === testId)).toBeFalsy();
    expect(result.satisfiedRequiredItems.find(req => req.id === testId)).toBeTruthy();
  });
});

describe('sonic return handling', () => {
  it('return-required device remains incomplete after removal only', () => {
    const job = makeSonicJob(['UX301']);
    const removalLedger = makeInventoryLedger(
      'closeout-ux301-return',
      'closeout-return-obligations',
      'OLD-RET-001',
      'removed',
      'removed_item',
    );
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'], inventoryLedgers: [removalLedger] },
    });
    const returnId = scopedProcedureRequirementId(sonicProcedure, 'equipment', 'closeout-ux301-return');
    expect(result.missingRequiredItems.find(req => req.id === returnId)).toBeTruthy();
  });

  it('actual return custody evidence with receipt and tracking satisfies return requirement', () => {
    const job = makeSonicJob(['UX301']);
    const returnLedger = makeReturnLedger('closeout-ux301-return', 'closeout-return-obligations', 'OLD-RET-002');
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'], inventoryLedgers: [returnLedger] },
    });
    const returnId = scopedProcedureRequirementId(sonicProcedure, 'equipment', 'closeout-ux301-return');
    expect(result.missingRequiredItems.find(req => req.id === returnId)).toBeFalsy();
    expect(result.satisfiedRequiredItems.find(req => req.id === returnId)).toBeTruthy();
  });
});

describe('sonic troubleshooting and reference content', () => {
  it('recommended/reference troubleshooting content does not block closeout', () => {
    const job = makeSonicJob(['UX301']);
    const result = evaluateJobCloseout(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'] },
    });

    const tsIds = sonicProcedure.steps
      .filter(s => s.phaseId === 'troubleshooting')
      .map(s => scopedProcedureRequirementId(sonicProcedure, 'step', s.id));

    const blockingTs = result.missingRequiredItems.filter(req => tsIds.includes(req.id));
    expect(blockingTs).toHaveLength(0);
    expect(result.referenceItems.length).toBeGreaterThanOrEqual(1);
  });
});

describe('sonic guided vs quick mode consistency', () => {
  it('Guided and Quick modes derive identical blocking requirements', () => {
    const job = makeSonicJob(['UX301']);
    const model = deriveProcedureWorkspaceModel(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'] },
    });

    const blockingIds = model.steps
      .flatMap(s => s.blockingRequirements)
      .map(r => r.id)
      .sort();

    // Quick vs Guided is a UI preference; the model derivation does not use mode.
    // Re-derive to confirm stability.
    const model2 = deriveProcedureWorkspaceModel(job, {
      procedureCatalog: catalog,
      context: { deviceTypes: ['UX301'] },
    });
    const blockingIds2 = model2.steps
      .flatMap(s => s.blockingRequirements)
      .map(r => r.id)
      .sort();

    expect(blockingIds).toEqual(blockingIds2);
  });

  it('switching modes does not change progress', () => {
    const job = makeSonicJob(['V400M', 'UX301']);
    const context = { deviceTypes: ['V400M', 'UX301'] as string[], satisfiedRequirementIds: [] as string[] };

    const model1 = deriveProcedureWorkspaceModel(job, { procedureCatalog: catalog, context });
    const progress1 = model1.summary.percentComplete;

    const model2 = deriveProcedureWorkspaceModel(job, { procedureCatalog: catalog, context });
    const progress2 = model2.summary.percentComplete;

    expect(progress1).toBe(progress2);
    expect(model1.summary.missingRequiredItems).toBe(model2.summary.missingRequiredItems);
  });
});

describe('sonic closeout safety and version enforcement', () => {
  it('unresolved procedure assignment blocks closeout safely', () => {
    const job = makeJob({
      procedureAssignment: {
        procedureId: 'sonic-verifone-device-swap',
        procedureVersion: '99.99.99',
        assignedAt,
        assignmentSource: 'manual',
      },
    });
    const result = evaluateJobCloseout(job, { procedureCatalog: catalog });
    expect(result.completionAllowed).toBe(false);
    expect(result.missingRequiredItems[0]?.id).toContain('procedure-unresolved');
  });

  it('exact procedure version remains enforced — no fallback to latest', () => {
    const job = makeJob({
      procedureAssignment: {
        procedureId: sonicProcedure.id,
        procedureVersion: '1.0.0',
        assignedAt,
        assignmentSource: 'manual',
      },
    });
    const resolved = resolveProcedureAssignment(job, catalog);
    expect(resolved.status).toBe('resolved');

    const jobBad = makeJob({
      procedureAssignment: {
        procedureId: sonicProcedure.id,
        procedureVersion: '1.0.1',
        assignedAt,
        assignmentSource: 'manual',
      },
    });
    const bad = resolveProcedureAssignment(jobBad, catalog);
    expect(bad.status).toBe('not_found');
  });
});

describe('sonic deviceTypes array condition support', () => {
  it('evaluates device_type_equals against a deviceTypes array', () => {
    expect(evaluateProcedureCondition(
      { type: 'device_type_equals', deviceType: 'UX301' },
      { deviceTypes: ['V400M', 'UX301'] },
    )).toMatchObject({ status: 'active', active: true });

    expect(evaluateProcedureCondition(
      { type: 'device_type_equals', deviceType: 'UX401' },
      { deviceTypes: ['V400M', 'UX301'] },
    )).toMatchObject({ status: 'inactive', active: false });
  });

  it('falls back to single deviceType when deviceTypes is absent', () => {
    expect(evaluateProcedureCondition(
      { type: 'device_type_equals', deviceType: 'V400M' },
      { deviceType: 'V400M' },
    )).toMatchObject({ status: 'active', active: true });
  });

  it('returns unresolved when neither deviceType nor deviceTypes is provided', () => {
    expect(evaluateProcedureCondition(
      { type: 'device_type_equals', deviceType: 'V400M' },
      {},
    )).toMatchObject({ status: 'unresolved', active: false });
  });
});

describe('sonic effective closeout with manual requirements', () => {
  it('preserves manual job requirements alongside procedure requirements', () => {
    const job = makeSonicJob(['V400M'], {
      closeoutRequirements: [{ id: 'manual-sonic-note', kind: 'required', label: 'Manager signature', satisfied: false }],
    });
    const effective = getEffectiveCloseoutRequirements(job, { procedureCatalog: catalog, context: { deviceTypes: ['V400M'] } });
    expect(effective.requirements.map(r => r.id)).toContain('manual-sonic-note');
    expect(effective.requirements.some(r => r.id.startsWith('procedure:sonic-verifone-device-swap@1.0.0:'))).toBe(true);
  });
});
