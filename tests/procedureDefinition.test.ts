import { describe, expect, it } from 'vitest';
import {
  createNextProcedureVersion,
  getProcedureStepById,
  getProcedureStepsInOrder,
  isProcedureVersionImmutable,
  validateProcedureDefinition,
  validateStableStepIdsUnique,
  validateNestedRequirementIdsUnique,
} from '../src/features/jobs/procedures/procedureDefinition';
import type { ProcedureDefinition } from '../src/features/jobs/procedures/types';

function makeProcedure(overrides: Partial<ProcedureDefinition> = {}): ProcedureDefinition {
  return {
    id: 'proc-technician-generic',
    customerKey: 'generic-customer',
    companyKey: 'generic-company',
    name: 'Generic Technician Procedure',
    description: 'Customer-agnostic technician procedure foundation.',
    version: '1.0.0',
    status: 'active',
    category: 'technician',
    jobType: 'field_task',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z',
    steps: [
      {
        id: 'arrival-check',
        phaseId: 'arrival',
        phaseLabel: 'Arrival',
        title: 'Confirm site access',
        guidedInstructions: 'Confirm you are at the correct location and have access to the work area.',
        quickCheckpoint: 'Confirm access',
        classification: 'required',
        displayOrder: 20,
        proofRequirements: [
          {
            id: 'arrival-photo',
            label: 'Arrival photo',
            proofType: 'photo',
            classification: 'required',
            instructions: 'Capture a photo that proves arrival at the correct location.',
            visitScope: 'current_visit',
            minimumCount: 1,
          },
        ],
      },
      {
        id: 'equipment-check',
        phaseId: 'work',
        phaseLabel: 'Work',
        title: 'Record equipment',
        guidedInstructions: 'Record model and serial details before starting equipment work.',
        quickCheckpoint: 'Record equipment',
        classification: 'recommended',
        displayOrder: 10,
        equipmentRequirements: [
          {
            id: 'terminal-serial',
            label: 'Terminal serial',
            deviceModel: 'Generic terminal',
            quantity: 1,
            serialRequirement: 'single',
            trackRemovedEquipment: true,
            returnRequired: false,
            classification: 'recommended',
          },
        ],
        testingRequirements: [
          {
            id: 'connectivity-test',
            label: 'Connectivity test',
            validationType: 'connectivity_test',
            classification: 'recommended',
            instructions: 'Verify the device can connect before leaving.',
          },
        ],
      },
      {
        id: 'reference-notes',
        phaseId: 'reference',
        phaseLabel: 'Reference',
        title: 'Review reference notes',
        guidedInstructions: 'Read any reference notes for this generic job.',
        classification: 'reference',
        displayOrder: 30,
        supportEscalations: [
          {
            id: 'generic-support',
            escalationLabel: 'Generic support',
            contactRoleType: 'technical_support',
            instructions: 'Contact support if a blocker prevents completion.',
            referenceNumberRequired: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('procedure definitions', () => {
  it('accepts a valid customer-agnostic procedure', () => {
    const result = validateProcedureDefinition(makeProcedure());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports missing required procedure fields as structured errors', () => {
    const result = validateProcedureDefinition({
      steps: makeProcedure().steps,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROCEDURE_FIELD_REQUIRED', path: 'id' }),
      expect.objectContaining({ code: 'PROCEDURE_FIELD_REQUIRED', path: 'customerKey' }),
      expect.objectContaining({ code: 'PROCEDURE_FIELD_REQUIRED', path: 'version' }),
    ]));
  });

  it('detects duplicate step IDs', () => {
    const procedure = makeProcedure({
      steps: [
        makeProcedure().steps[0],
        { ...makeProcedure().steps[1], id: 'arrival-check' },
      ],
    });

    const result = validateStableStepIdsUnique(procedure);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: 'DUPLICATE_STEP_ID', path: 'steps[1].id' });
  });

  it('detects duplicate nested requirement IDs within the procedure', () => {
    const base = makeProcedure();
    const procedure = makeProcedure({
      steps: [
        base.steps[0],
        {
          ...base.steps[1],
          equipmentRequirements: [
            {
              id: 'arrival-photo',
              label: 'Duplicate nested ID',
              serialRequirement: 'single',
              classification: 'required',
            },
          ],
        },
      ],
    });

    const result = validateNestedRequirementIdsUnique(procedure);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: 'DUPLICATE_NESTED_REQUIREMENT_ID' });
  });

  it('returns steps in stable display order', () => {
    const ordered = getProcedureStepsInOrder(makeProcedure());

    expect(ordered.map(step => step.id)).toEqual(['equipment-check', 'arrival-check', 'reference-notes']);
    expect(getProcedureStepById(makeProcedure(), 'arrival-check')?.title).toBe('Confirm site access');
  });

  it('supports required, recommended, and reference steps', () => {
    const procedure = makeProcedure();
    const classifications = procedure.steps.map(step => step.classification);

    expect(classifications).toEqual(['required', 'recommended', 'reference']);
    expect(validateProcedureDefinition(procedure).valid).toBe(true);
  });

  it('supports a valid conditional step', () => {
    const procedure = makeProcedure({
      steps: [
        {
          id: 'device-specific-step',
          title: 'Device-specific check',
          guidedInstructions: 'Perform this step only when the device type matches.',
          quickCheckpoint: 'Device-specific check',
          classification: 'conditional',
          displayOrder: 1,
          condition: { type: 'device_type_equals', deviceType: 'pin-pad' },
        },
      ],
    });

    expect(validateProcedureDefinition(procedure).valid).toBe(true);
  });

  it('reports malformed condition definitions', () => {
    const procedure = makeProcedure({
      steps: [
        {
          id: 'bad-condition',
          title: 'Bad condition',
          guidedInstructions: 'This condition is missing a value.',
          quickCheckpoint: 'Bad condition',
          classification: 'conditional',
          displayOrder: 1,
          condition: { type: 'job_field_equals', field: 'jobType', value: '' },
        },
      ],
    });

    const result = validateProcedureDefinition(procedure);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MALFORMED_CONDITION', path: 'steps[0].condition.value' }),
    ]));
  });

  it('clones a procedure into the next immutable version without mutating the original', () => {
    const original = makeProcedure();
    const clone = createNextProcedureVersion(original, {
      nextVersion: '1.1.0',
      timestamp: '2026-08-16T10:00:00.000Z',
    });

    expect(isProcedureVersionImmutable(original, [{ procedureId: original.id, version: original.version }])).toBe(true);
    expect(clone).toMatchObject({
      id: original.id,
      version: '1.1.0',
      status: 'draft',
      createdAt: '2026-08-16T10:00:00.000Z',
      updatedAt: '2026-08-16T10:00:00.000Z',
    });
    expect(original.version).toBe('1.0.0');
    expect(original.status).toBe('active');

    clone.steps[0].title = 'Changed in clone';
    expect(original.steps[0].title).toBe('Confirm site access');
  });

  it('uses the same underlying step requirements for Guided Mode and Quick Mode', () => {
    const procedure = makeProcedure();
    const step = getProcedureStepById(procedure, 'arrival-check');

    expect(step?.guidedInstructions).toContain('correct location');
    expect(step?.quickCheckpoint).toBe('Confirm access');
    expect(step?.proofRequirements?.map(requirement => requirement.id)).toEqual(['arrival-photo']);
    expect(step?.proofRequirements?.[0].classification).toBe('required');
  });
});
