import { describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import { evaluateJobCloseout } from '../src/features/jobs/jobCloseout';
import { composeProcedureCatalog } from '../src/features/jobs/procedures/procedureCatalog';
import type { ProcedureDefinition, ProcedureProofRequirement, ProcedureProofType, ProcedureVisitScope } from '../src/features/jobs/procedures/types';
import {
  buildProcedureProofAsset,
  doesProofSatisfyRequirement,
  evaluateProofRequirement,
  getProofForJob,
  getSatisfiedProofRequirementIds,
} from '../src/features/proofVault/procedureProof';
import type { ProofRecord } from '../src/features/proofVault/types';

const assignedAt = '2026-08-15T09:00:00.000Z';

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
    procedureAssignment: {
      procedureId: 'proc-proof',
      procedureVersion: '1.0.0',
      assignedAt,
      assignmentSource: 'manual',
    },
    ...overrides,
  };
}

function proofRequirement(overrides: Partial<ProcedureProofRequirement> = {}): ProcedureProofRequirement {
  return {
    id: 'arrival-photo',
    label: 'Arrival photo',
    proofType: 'photo',
    classification: 'required',
    instructions: 'Capture arrival proof.',
    minimumCount: 1,
    ...overrides,
  };
}

function makeProcedure(options: {
  version?: string;
  stepClassification?: 'required' | 'conditional' | 'recommended' | 'reference';
  proof?: ProcedureProofRequirement;
  conditionActiveDeviceType?: string;
} = {}): ProcedureDefinition {
  return {
    id: 'proc-proof',
    customerKey: 'generic',
    name: 'Proof Procedure',
    description: 'Generic proof procedure.',
    version: options.version ?? '1.0.0',
    status: 'active',
    category: 'technician',
    jobType: 'field_task',
    createdAt: '2026-08-15T08:00:00.000Z',
    updatedAt: '2026-08-15T08:00:00.000Z',
    steps: [{
      id: 'arrival-step',
      title: 'Capture arrival proof',
      guidedInstructions: 'Capture proof.',
      quickCheckpoint: 'Proof',
      classification: options.stepClassification ?? 'reference',
      condition: options.stepClassification === 'conditional'
        ? { type: 'device_type_equals', deviceType: options.conditionActiveDeviceType ?? 'pin-pad' }
        : undefined,
      displayOrder: 1,
      proofRequirements: [options.proof ?? proofRequirement()],
    }],
  };
}

function makeProofRecord(
  jobId = 'job-1',
  proofs: Array<{
    id?: string;
    requirementId?: string;
    procedureId?: string;
    procedureVersion?: string;
    procedureStepId?: string;
    proofType?: ProcedureProofType;
    visitId?: string;
  }> = [{}],
): ProofRecord {
  return {
    jobId,
    storeName: 'Vons',
    address: '5201 White Ln, Bakersfield, CA',
    completionTime: '2026-08-15T10:00:00.000Z',
    arrivalTime: '2026-08-15T09:00:00.000Z',
    photos: proofs.map((proof, index) => ({
      id: proof.id ?? `proof-${index}`,
      name: `proof-${index}.jpg`,
      dataUrl: 'data:image/jpeg;base64,abc',
      addedAt: `2026-08-15T09:0${index}:00.000Z`,
      source: 'procedure_requirement',
      proofType: proof.proofType ?? 'photo',
      requirementId: proof.requirementId ?? 'arrival-photo',
      procedureId: proof.procedureId ?? 'proc-proof',
      procedureVersion: proof.procedureVersion ?? '1.0.0',
      procedureStepId: proof.procedureStepId ?? 'arrival-step',
      visitId: proof.visitId,
    })),
    screenshots: [],
    receipts: [],
    notes: '',
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-08-15T10:00:00.000Z',
  };
}

function evaluateWithProofs(
  procedure: ProcedureDefinition,
  proofRecords: ProofRecord[] = [],
  job: Job = makeJob(),
  extraContext: Record<string, unknown> = {},
) {
  return evaluateJobCloseout(job, {
    procedureCatalog: composeProcedureCatalog(procedure),
    context: { proofRecords, ...extraContext },
  });
}

describe('procedure proof closeout integration', () => {
  it('blocks closeout when required proof is missing', () => {
    const result = evaluateWithProofs(makeProcedure());

    expect(result.completionAllowed).toBe(false);
    expect(result.missingRequiredItems.map(item => item.id)).toContain('procedure:proc-proof@1.0.0:proof:arrival-photo');
  });

  it('satisfies required proof with matching real proof evidence', () => {
    const result = evaluateWithProofs(makeProcedure(), [makeProofRecord()]);

    expect(result.completionAllowed).toBe(true);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toContain('procedure:proc-proof@1.0.0:proof:arrival-photo');
  });

  it('does not satisfy requirements with unrelated proof', () => {
    const result = evaluateWithProofs(makeProcedure(), [makeProofRecord('job-1', [{
      requirementId: 'other-proof',
    }])]);

    expect(result.completionAllowed).toBe(false);
  });

  it('respects minimumCount for proof requirements', () => {
    const procedure = makeProcedure({ proof: proofRequirement({ minimumCount: 2 }) });

    expect(evaluateWithProofs(procedure, [makeProofRecord('job-1', [{ id: 'one' }])]).completionAllowed).toBe(false);
    expect(evaluateWithProofs(procedure, [makeProofRecord('job-1', [{ id: 'one' }, { id: 'two' }])]).completionAllowed).toBe(true);
  });

  it('only satisfies current-visit proof with proof from the correct visit', () => {
    const procedure = makeProcedure({ proof: proofRequirement({ visitScope: 'current_visit' }) });
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

    expect(evaluateWithProofs(procedure, [makeProofRecord('job-1', [{ visitId: 'visit-1' }])], job).completionAllowed).toBe(false);
    expect(evaluateWithProofs(procedure, [makeProofRecord('job-1', [{ visitId: 'visit-2' }])], job).completionAllowed).toBe(true);
  });

  it('keeps visit 1 and visit 2 scoped proof distinct', () => {
    const procedure = makeProcedure({ proof: proofRequirement({ visitScope: 'current_visit' }) });
    const proof = getProofForJob([makeProofRecord('job-1', [{ visitId: 'visit-1' }])], 'job-1')[0];
    const requirement = procedure.steps[0].proofRequirements?.[0] as ProcedureProofRequirement;

    expect(doesProofSatisfyRequirement(proof, procedure, procedure.steps[0], requirement, { visitId: 'visit-2' })).toBe(false);
  });

  it('does not block inactive conditional proof', () => {
    const procedure = makeProcedure({ stepClassification: 'conditional' });
    const result = evaluateWithProofs(procedure, [], makeJob(), { deviceType: 'terminal' });

    expect(result.completionAllowed).toBe(true);
    expect(result.activeConditionalRequirements).toHaveLength(0);
  });

  it('blocks active conditional proof when missing', () => {
    const procedure = makeProcedure({ stepClassification: 'conditional' });
    const result = evaluateWithProofs(procedure, [], makeJob(), { deviceType: 'pin-pad' });

    expect(result.completionAllowed).toBe(false);
    expect(result.activeConditionalRequirements.map(item => item.id)).toContain('procedure:proc-proof@1.0.0:proof:arrival-photo');
  });

  it('satisfies active conditional proof with matching proof', () => {
    const procedure = makeProcedure({ stepClassification: 'conditional' });
    const result = evaluateWithProofs(procedure, [makeProofRecord()], makeJob(), {
      deviceType: 'pin-pad',
      satisfiedRequirementIds: ['procedure:proc-proof@1.0.0:step:arrival-step'],
    });

    expect(result.completionAllowed).toBe(true);
  });

  it('keeps recommended proof non-blocking', () => {
    const procedure = makeProcedure({ proof: proofRequirement({ classification: 'recommended' }) });
    const result = evaluateWithProofs(procedure);

    expect(result.completionAllowed).toBe(true);
    expect(result.recommendedItems.map(item => item.id)).toContain('procedure:proc-proof@1.0.0:proof:arrival-photo');
  });

  it('stamps procedure requirement identity on newly captured proof assets', () => {
    const asset = buildProcedureProofAsset({
      id: 'captured-proof',
      fileName: 'arrival.jpg',
      dataUrl: 'data:image/jpeg;base64,abc',
      addedAt: '2026-08-15T09:00:00.000Z',
      proofType: 'photo',
      requirementId: 'arrival-photo',
      procedureId: 'proc-proof',
      procedureVersion: '1.0.0',
      procedureStepId: 'arrival-step',
      visitId: 'visit-1',
    });

    expect(asset).toMatchObject({
      source: 'procedure_requirement',
      requirementId: 'arrival-photo',
      procedureId: 'proc-proof',
      procedureVersion: '1.0.0',
      procedureStepId: 'arrival-step',
      visitId: 'visit-1',
    });
  });

  it('keeps legacy proof readable without satisfying procedure requirements by fuzzy matching', () => {
    const legacy: ProofRecord = {
      ...makeProofRecord('job-1', []),
      photos: [{
        id: 'legacy',
        name: 'Arrival photo.jpg',
        dataUrl: 'data:image/jpeg;base64,abc',
        addedAt: '2026-08-15T09:00:00.000Z',
      }],
    };

    expect(getProofForJob([legacy], 'job-1')).toHaveLength(1);
    expect(evaluateWithProofs(makeProcedure(), [legacy]).completionAllowed).toBe(false);
  });

  it('keeps legacy jobs with no procedure unchanged', () => {
    const result = evaluateJobCloseout(makeJob({
      procedureAssignment: undefined,
      closeoutRequirements: [{ id: 'manual', kind: 'required', label: 'Manual', satisfied: true }],
    }), {
      procedureCatalog: composeProcedureCatalog(makeProcedure()),
      context: { proofRecords: [makeProofRecord()] },
    });

    expect(result.completionAllowed).toBe(true);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toEqual(['manual']);
  });

  it('is deterministic across repeated evaluation', () => {
    const procedure = makeProcedure();
    const records = [makeProofRecord()];

    expect(evaluateWithProofs(procedure, records)).toEqual(evaluateWithProofs(procedure, records));
  });

  it('requires exact procedure version identity', () => {
    const result = evaluateWithProofs(makeProcedure({ version: '2.0.0' }), [
      makeProofRecord('job-1', [{ procedureVersion: '1.0.0' }]),
    ], makeJob({
      procedureAssignment: {
        procedureId: 'proc-proof',
        procedureVersion: '2.0.0',
        assignedAt,
        assignmentSource: 'manual',
      },
    }));

    expect(result.completionAllowed).toBe(false);
  });

  it('preserves unresolved procedure closeout blocking', () => {
    const result = evaluateJobCloseout(makeJob(), {
      procedureCatalog: [],
      context: { proofRecords: [makeProofRecord()] },
    });

    expect(result.completionAllowed).toBe(false);
    expect(result.missingRequiredItems.map(item => item.id)).toContain('procedure-unresolved:proc-proof@1.0.0');
  });
});

describe('proof requirement helper details', () => {
  it('reports proof requirement evaluation counts and satisfied IDs', () => {
    const procedure = makeProcedure({ proof: proofRequirement({ minimumCount: 2 }) });
    const proofs = getProofForJob([makeProofRecord('job-1', [{ id: 'one' }, { id: 'two' }])], 'job-1');
    const requirement = procedure.steps[0].proofRequirements?.[0] as ProcedureProofRequirement;

    expect(evaluateProofRequirement(proofs, procedure, procedure.steps[0], requirement)).toMatchObject({
      satisfied: true,
      requiredCount: 2,
      matchingCount: 2,
    });
    expect(getSatisfiedProofRequirementIds(proofs, procedure)).toEqual(['arrival-photo']);
  });

  it('supports explicit visit-scope helper checks', () => {
    const procedure = makeProcedure({ proof: proofRequirement({ visitScope: 'current_visit' as ProcedureVisitScope }) });
    const proofs = getProofForJob([makeProofRecord('job-1', [{ id: 'visit-proof', visitId: 'visit-1' }])], 'job-1');
    const requirement = procedure.steps[0].proofRequirements?.[0] as ProcedureProofRequirement;

    expect(evaluateProofRequirement(proofs, procedure, procedure.steps[0], requirement, { visitId: 'visit-1' }).satisfied).toBe(true);
    expect(evaluateProofRequirement(proofs, procedure, procedure.steps[0], requirement, { visitId: 'visit-2' }).satisfied).toBe(false);
  });
});
