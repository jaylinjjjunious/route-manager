import { describe, expect, it } from 'vitest';
import type { Job } from '../src/types';
import {
  evaluateJobCloseout,
  getJobEffectiveCloseoutRequirements,
} from '../src/features/jobs/jobCloseout';
import {
  composeProcedureCatalog,
  getProcedureByIdAndVersion,
  hasResolvedProcedure,
  listProcedureVersions,
  resolveProcedureAssignment,
} from '../src/features/jobs/procedures/procedureCatalog';
import {
  deriveProcedureCloseoutRequirements,
  getEffectiveCloseoutRequirements,
  mergeCloseoutRequirements,
} from '../src/features/jobs/procedures/procedureCloseout';
import { evaluateProcedureCondition } from '../src/features/jobs/procedures/procedureConditions';
import type { ProcedureDefinition } from '../src/features/jobs/procedures/types';

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
    ...overrides,
  };
}

function makeAssignedJob(overrides: Partial<Job> = {}): Job {
  return makeJob({
    procedureAssignment: {
      procedureId: 'proc-generic',
      procedureVersion: '1.0.0',
      assignedAt,
      assignmentSource: 'manual',
    },
    ...overrides,
  });
}

function makeProcedure(overrides: Partial<ProcedureDefinition> = {}): ProcedureDefinition {
  return {
    id: 'proc-generic',
    customerKey: 'generic',
    name: 'Generic Field Procedure',
    description: 'Generic procedure for field work.',
    version: '1.0.0',
    status: 'active',
    category: 'technician',
    jobType: 'field_task',
    createdAt: '2026-08-15T08:00:00.000Z',
    updatedAt: '2026-08-15T08:00:00.000Z',
    steps: [
      {
        id: 'required-step',
        title: 'Complete required procedure step',
        guidedInstructions: 'Perform the required step.',
        quickCheckpoint: 'Required step complete',
        classification: 'required',
        displayOrder: 1,
      },
    ],
    ...overrides,
  };
}

const catalog = composeProcedureCatalog(makeProcedure(), makeProcedure({ version: '2.0.0' }));
const requiredStepId = 'procedure:proc-generic@1.0.0:step:required-step';

describe('procedure catalog resolution', () => {
  it('resolves an exact procedure ID and version', () => {
    const result = resolveProcedureAssignment(makeAssignedJob(), catalog);

    expect(result.status).toBe('resolved');
    expect(hasResolvedProcedure(result)).toBe(true);
    expect(result.procedure?.version).toBe('1.0.0');
    expect(getProcedureByIdAndVersion(catalog, 'proc-generic', '1.0.0')?.id).toBe('proc-generic');
    expect(listProcedureVersions(catalog, 'proc-generic')).toEqual(['1.0.0', '2.0.0']);
  });

  it('returns unassigned for jobs with no procedure assignment', () => {
    expect(resolveProcedureAssignment(makeJob(), catalog)).toMatchObject({ status: 'unassigned' });
  });

  it('returns not_found for an unknown procedure ID', () => {
    const result = resolveProcedureAssignment(makeAssignedJob({
      procedureAssignment: {
        procedureId: 'missing-proc',
        procedureVersion: '1.0.0',
        assignedAt,
        assignmentSource: 'manual',
      },
    }), catalog);

    expect(result.status).toBe('not_found');
  });

  it('returns not_found for a known procedure with the wrong version', () => {
    const result = resolveProcedureAssignment(makeAssignedJob({
      procedureAssignment: {
        procedureId: 'proc-generic',
        procedureVersion: '9.0.0',
        assignedAt,
        assignmentSource: 'manual',
      },
    }), catalog);

    expect(result.status).toBe('not_found');
  });

  it('does not fall back to the latest version', () => {
    const result = resolveProcedureAssignment(makeAssignedJob({
      procedureAssignment: {
        procedureId: 'proc-generic',
        procedureVersion: '1.5.0',
        assignedAt,
        assignmentSource: 'manual',
      },
    }), catalog);

    expect(result.status).toBe('not_found');
    expect(result.procedure).toBeUndefined();
  });

  it('returns invalid_assignment for malformed assignment data', () => {
    const result = resolveProcedureAssignment(makeAssignedJob({
      procedureAssignment: {
        procedureId: 'bad id',
        procedureVersion: '0',
        assignedAt,
        assignmentSource: 'manual',
      },
    }), catalog);

    expect(result.status).toBe('invalid_assignment');
  });
});

describe('procedure-derived closeout requirements', () => {
  it('derives a blocking requirement from a required step', () => {
    const requirements = deriveProcedureCloseoutRequirements(makeProcedure());

    expect(requirements).toContainEqual(expect.objectContaining({
      id: requiredStepId,
      kind: 'required',
      satisfied: false,
    }));
  });

  it('keeps recommended and reference steps non-blocking', () => {
    const procedure = makeProcedure({
      steps: [
        {
          id: 'recommended-step',
          title: 'Recommended checkpoint',
          guidedInstructions: 'Recommended work.',
          quickCheckpoint: 'Recommended',
          classification: 'recommended',
          displayOrder: 1,
        },
        {
          id: 'reference-step',
          title: 'Reference material',
          guidedInstructions: 'Reference only.',
          classification: 'reference',
          displayOrder: 2,
        },
      ],
    });

    const result = evaluateJobCloseout(makeAssignedJob(), {
      procedureResolution: { status: 'resolved', procedure },
    });

    expect(result.completionAllowed).toBe(true);
    expect(result.recommendedItems).toHaveLength(1);
    expect(result.referenceItems).toHaveLength(1);
  });

  it('does not block inactive conditional requirements', () => {
    const procedure = makeProcedure({
      steps: [{
        id: 'pinpad-only',
        title: 'PIN pad check',
        guidedInstructions: 'Check PIN pad.',
        quickCheckpoint: 'PIN pad',
        classification: 'conditional',
        condition: { type: 'device_type_equals', deviceType: 'pin-pad' },
        displayOrder: 1,
      }],
    });

    const result = evaluateJobCloseout(makeAssignedJob(), {
      procedureResolution: { status: 'resolved', procedure },
      context: { deviceType: 'terminal' },
    });

    expect(result.completionAllowed).toBe(true);
    expect(result.activeConditionalRequirements).toHaveLength(0);
  });

  it('blocks active conditional requirements', () => {
    const procedure = makeProcedure({
      steps: [{
        id: 'pinpad-only',
        title: 'PIN pad check',
        guidedInstructions: 'Check PIN pad.',
        quickCheckpoint: 'PIN pad',
        classification: 'conditional',
        condition: { type: 'device_type_equals', deviceType: 'pin-pad' },
        displayOrder: 1,
      }],
    });

    const result = evaluateJobCloseout(makeAssignedJob(), {
      procedureResolution: { status: 'resolved', procedure },
      context: { deviceType: 'pin-pad' },
    });

    expect(result.completionAllowed).toBe(false);
    expect(result.activeConditionalRequirements.map(item => item.id)).toEqual(['procedure:proc-generic@1.0.0:step:pinpad-only']);
  });

  it('derives proof requirements', () => {
    const requirements = deriveProcedureCloseoutRequirements(makeProcedure({
      steps: [{
        id: 'proof-step',
        title: 'Capture proof',
        guidedInstructions: 'Capture proof.',
        quickCheckpoint: 'Proof',
        classification: 'required',
        displayOrder: 1,
        proofRequirements: [{
          id: 'arrival-photo',
          label: 'Arrival photo',
          proofType: 'photo',
          classification: 'required',
          instructions: 'Capture arrival photo.',
          minimumCount: 1,
        }],
      }],
    }));

    expect(requirements).toContainEqual(expect.objectContaining({
      id: 'procedure:proc-generic@1.0.0:proof:arrival-photo',
      kind: 'required',
      label: 'Arrival photo',
    }));
  });

  it('derives equipment and serial requirements', () => {
    const requirements = deriveProcedureCloseoutRequirements(makeProcedure({
      steps: [{
        id: 'equipment-step',
        title: 'Record equipment',
        guidedInstructions: 'Record equipment.',
        quickCheckpoint: 'Equipment',
        classification: 'required',
        displayOrder: 1,
        equipmentRequirements: [{
          id: 'terminal-serial',
          label: 'Terminal serial',
          deviceModel: 'Generic terminal',
          quantity: 1,
          serialRequirement: 'single',
          classification: 'required',
        }],
      }],
    }));

    expect(requirements).toContainEqual(expect.objectContaining({
      id: 'procedure:proc-generic@1.0.0:equipment:terminal-serial',
      description: expect.stringContaining('Serial requirement: single.'),
    }));
  });

  it('derives testing requirements', () => {
    const requirements = deriveProcedureCloseoutRequirements(makeProcedure({
      steps: [{
        id: 'testing-step',
        title: 'Run test',
        guidedInstructions: 'Run test.',
        quickCheckpoint: 'Test',
        classification: 'required',
        displayOrder: 1,
        testingRequirements: [{
          id: 'connectivity-test',
          label: 'Connectivity test',
          validationType: 'connectivity_test',
          classification: 'required',
        }],
      }],
    }));

    expect(requirements).toContainEqual(expect.objectContaining({
      id: 'procedure:proc-generic@1.0.0:testing:connectivity-test',
      description: expect.stringContaining('connectivity_test'),
    }));
  });

  it('derives support closeout obligations when a reference number is required', () => {
    const requirements = deriveProcedureCloseoutRequirements(makeProcedure({
      steps: [{
        id: 'support-step',
        title: 'Escalate',
        guidedInstructions: 'Escalate if needed.',
        quickCheckpoint: 'Escalate',
        classification: 'recommended',
        displayOrder: 1,
        supportEscalations: [{
          id: 'support-case',
          escalationLabel: 'Support case',
          contactRoleType: 'technical_support',
          instructions: 'Call support.',
          referenceNumberRequired: true,
        }],
      }],
    }));

    expect(requirements).toContainEqual(expect.objectContaining({
      id: 'procedure:proc-generic@1.0.0:support:support-case',
      kind: 'required',
    }));
  });

  it('uses stable deterministic IDs and repeated derivation is idempotent', () => {
    const procedure = makeProcedure();

    const once = deriveProcedureCloseoutRequirements(procedure);
    const twice = deriveProcedureCloseoutRequirements(procedure);

    expect(once.map(requirement => requirement.id)).toEqual([requiredStepId]);
    expect(twice).toEqual(once);
  });
});

describe('procedure closeout merge and integration', () => {
  it('preserves manual and procedure requirements', () => {
    const result = getEffectiveCloseoutRequirements(makeAssignedJob({
      closeoutRequirements: [{ id: 'manual-proof', kind: 'required', label: 'Manual proof', satisfied: false }],
    }), { procedureCatalog: catalog });

    expect(result.requirements.map(requirement => requirement.id)).toEqual(['manual-proof', requiredStepId]);
  });

  it('handles duplicate IDs deterministically with first requirement winning', () => {
    const merged = mergeCloseoutRequirements(
      [{ id: requiredStepId, kind: 'recommended', label: 'Manual duplicate' }],
      [{ id: requiredStepId, kind: 'required', label: 'Procedure duplicate' }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ label: 'Manual duplicate', kind: 'recommended' });
  });

  it('does not grow requirements on repeated merge', () => {
    const manual = [{ id: 'manual-proof', kind: 'required' as const, label: 'Manual proof' }];
    const derived = deriveProcedureCloseoutRequirements(makeProcedure());

    expect(mergeCloseoutRequirements(manual, derived)).toEqual(mergeCloseoutRequirements(manual, derived));
  });

  it('blocks closeout when a resolved procedure has an unsatisfied required item', () => {
    const result = evaluateJobCloseout(makeAssignedJob(), { procedureCatalog: catalog });

    expect(result.completionAllowed).toBe(false);
    expect(result.missingRequiredItems.map(item => item.id)).toContain(requiredStepId);
  });

  it('allows closeout when derived required items are satisfied in context', () => {
    const result = evaluateJobCloseout(makeAssignedJob(), {
      procedureCatalog: catalog,
      context: { satisfiedRequirementIds: [requiredStepId] },
    });

    expect(result.completionAllowed).toBe(true);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toEqual([requiredStepId]);
  });

  it('blocks closeout safely when an assigned procedure cannot be resolved', () => {
    const result = getJobEffectiveCloseoutRequirements(makeAssignedJob(), { procedureCatalog: [] });
    const evaluation = evaluateJobCloseout(makeAssignedJob(), { procedureCatalog: [] });

    expect(result.procedureResolution.status).toBe('not_found');
    expect(result.requirements[0]).toMatchObject({
      id: 'procedure-unresolved:proc-generic@1.0.0',
      kind: 'required',
      satisfied: false,
    });
    expect(evaluation.completionAllowed).toBe(false);
  });

  it('keeps legacy jobs with no procedure on existing closeout behavior', () => {
    const result = evaluateJobCloseout(makeJob({
      closeoutRequirements: [{ id: 'manual-proof', kind: 'required', label: 'Manual proof', satisfied: true }],
    }), { procedureCatalog: catalog });

    expect(result.completionAllowed).toBe(true);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toEqual(['manual-proof']);
  });
});

describe('procedure condition evaluation boundary', () => {
  it('returns unresolved instead of active when condition context is missing', () => {
    expect(evaluateProcedureCondition({ type: 'device_type_equals', deviceType: 'pin-pad' })).toMatchObject({
      status: 'unresolved',
      active: false,
    });
  });

  it('evaluates supported condition context deterministically', () => {
    expect(evaluateProcedureCondition(
      { type: 'job_field_equals', field: 'jobType', value: 'field_task' },
      { job: makeJob() },
    )).toMatchObject({ status: 'active', active: true });
    expect(evaluateProcedureCondition(
      { type: 'previous_answer_equals', stepId: 'survey', answerKey: 'ready', value: true },
      { previousAnswers: { survey: { ready: true } } },
    )).toMatchObject({ status: 'active', active: true });
    expect(evaluateProcedureCondition(
      { type: 'equipment_present', equipmentRequirementId: 'terminal' },
      { presentEquipmentRequirementIds: ['terminal'] },
    )).toMatchObject({ status: 'active', active: true });
    expect(evaluateProcedureCondition(
      { type: 'equipment_missing', equipmentRequirementId: 'terminal' },
      { missingEquipmentRequirementIds: ['terminal'] },
    )).toMatchObject({ status: 'active', active: true });
    expect(evaluateProcedureCondition(
      { type: 'issue_present', issueType: 'connectivity' },
      { issueTypes: ['connectivity'] },
    )).toMatchObject({ status: 'active', active: true });
    expect(evaluateProcedureCondition(
      { type: 'blocker_present', blockerType: 'access' },
      { blockerTypes: ['access'] },
    )).toMatchObject({ status: 'active', active: true });
  });
});
