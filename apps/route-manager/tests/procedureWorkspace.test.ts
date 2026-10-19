// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '../src/types';
import type { ProofRecord } from '../src/features/proofVault/types';
import type { CustodyLedger } from '../src/services/inventory/chainOfCustody';
import ProcedureWorkspace from '../src/features/jobs/procedures/ProcedureWorkspace';
import { DEFAULT_PROCEDURE_CATALOG } from '../src/features/jobs/procedures/procedureCatalog';
import { deriveProcedureWorkspaceModel, scopedProcedureRequirementId } from '../src/features/jobs/procedures/procedureProgress';
import type { ProcedureDefinition } from '../src/features/jobs/procedures/types';
import type { ProcedureAssignmentResult } from '../src/features/jobs/procedures/jobProcedureAssignment';

const procedure = DEFAULT_PROCEDURE_CATALOG[0] as ProcedureDefinition;

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Generic Store',
    address: '100 Test Ave',
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

function assignedJob(overrides: Partial<Job> = {}): Job {
  return makeJob({
    procedureAssignment: {
      procedureId: procedure.id,
      procedureVersion: procedure.version,
      assignedAt: '2026-08-15T09:00:00.000Z',
      assignmentSource: 'manual',
    },
    ...overrides,
  });
}

function proofRecord(): ProofRecord {
  return {
    jobId: 'job-1',
    storeName: 'Generic Store',
    address: '100 Test Ave',
    completionTime: '',
    arrivalTime: '',
    photos: [{
      id: 'proof-1',
      name: 'site.jpg',
      dataUrl: 'data:image/jpeg;base64,abc',
      addedAt: '2026-08-15T10:00:00.000Z',
      source: 'procedure_requirement',
      proofType: 'photo',
      requirementId: 'site-photo',
      procedureId: procedure.id,
      procedureVersion: procedure.version,
      procedureStepId: 'arrival-context',
    }],
    screenshots: [],
    receipts: [],
    notes: '',
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-08-15T10:00:00.000Z',
  };
}

function inventoryLedger(): CustodyLedger {
  return {
    version: 1,
    jobId: 'job-1',
    domain: 'merchandising',
    items: [{
      id: 'item-1',
      domain: 'merchandising',
      jobId: 'job-1',
      partNumber: 'GENERIC',
      serialNumber: 'ABC123',
      status: 'received',
      evidence: [],
      eventIds: [],
      updatedAt: '2026-08-15T10:00:00.000Z',
      requirementId: 'primary-equipment',
      procedureId: procedure.id,
      procedureVersion: procedure.version,
      procedureStepId: 'equipment-identity',
      requirementRole: 'serial_capture',
    }],
    events: [],
  };
}

let container: HTMLDivElement;
let root: Root;

async function renderWorkspace(element: React.ReactElement) {
  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });
}

function clickByText(text: string) {
  const button = Array.from(document.querySelectorAll('button')).find(candidate =>
    candidate.textContent?.trim() === text,
  );
  expect(button, `button ${text}`).toBeTruthy();
  act(() => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe('procedure workspace progress derivation', () => {
  it('ships with a generic customer-agnostic catalog procedure', () => {
    expect(procedure.customerKey).toBe('generic');
    expect(procedure.name).toBe('Generic Field Work');
  });

  it('reports an unassigned job without blocking legacy loading', () => {
    const model = deriveProcedureWorkspaceModel(makeJob());
    expect(model.resolution.status).toBe('unassigned');
    expect(model.summary.applicableSteps).toBe(0);
  });

  it('resolves an assigned exact procedure version', () => {
    const model = deriveProcedureWorkspaceModel(assignedJob());
    expect(model.resolution.status).toBe('resolved');
    expect(model.procedure?.version).toBe('1.0.0');
  });

  it('does not silently resolve a missing assigned version', () => {
    const model = deriveProcedureWorkspaceModel(makeJob({
      procedureAssignment: {
        procedureId: procedure.id,
        procedureVersion: '9.0.0',
        assignedAt: '2026-08-15T09:00:00.000Z',
        assignmentSource: 'manual',
      },
    }));
    expect(model.resolution.status).toBe('not_found');
    expect(model.summary.missingRequiredItems).toBe(1);
  });

  it('marks required proof and equipment as missing without evidence', () => {
    const model = deriveProcedureWorkspaceModel(assignedJob());
    expect(model.summary.missingRequiredItems).toBeGreaterThanOrEqual(2);
    expect(model.summary.nextStep?.step.id).toBe('arrival-context');
  });

  it('satisfies the proof requirement from exact proof vault metadata', () => {
    const proofId = scopedProcedureRequirementId(procedure, 'proof', 'site-photo');
    const model = deriveProcedureWorkspaceModel(assignedJob(), {
      context: { proofRecords: [proofRecord()] },
    });
    const proof = model.steps.flatMap(step => step.requirements).find(requirement => requirement.id === proofId);
    expect(proof?.satisfied).toBe(true);
  });

  it('satisfies the equipment requirement from exact inventory custody metadata', () => {
    const equipmentId = scopedProcedureRequirementId(procedure, 'equipment', 'primary-equipment');
    const model = deriveProcedureWorkspaceModel(assignedJob(), {
      context: { inventoryLedgers: [inventoryLedger()] },
    });
    const equipment = model.steps.flatMap(step => step.requirements).find(requirement => requirement.id === equipmentId);
    expect(equipment?.satisfied).toBe(true);
  });

  it('shows recommended testing as nonblocking', () => {
    const model = deriveProcedureWorkspaceModel(assignedJob());
    const testing = model.steps.flatMap(step => step.requirements).find(requirement => requirement.source === 'testing');
    expect(testing?.kind).toBe('recommended');
    expect(testing?.blocking).toBe(false);
  });

  it('keeps reference support nonblocking without customer-specific contact data', () => {
    const model = deriveProcedureWorkspaceModel(assignedJob());
    const support = model.steps.flatMap(step => step.requirements).find(requirement => requirement.source === 'support');
    expect(support?.kind).toBe('reference');
    expect(support?.blocking).toBe(false);
  });

  it('derives 100 percent when required external evidence is present', () => {
    const arrivalStepId = scopedProcedureRequirementId(procedure, 'step', 'arrival-context');
    const equipmentStepId = scopedProcedureRequirementId(procedure, 'step', 'equipment-identity');
    const model = deriveProcedureWorkspaceModel(assignedJob({ priority: 'low' }), {
      context: {
        proofRecords: [proofRecord()],
        inventoryLedgers: [inventoryLedger()],
        satisfiedRequirementIds: [arrivalStepId, equipmentStepId],
        deviceType: 'terminal',
      },
    });
    expect(model.summary.percentComplete).toBe(100);
    expect(model.summary.nextStep).toBeUndefined();
  });

  it('uses narrow acknowledgements for testing requirements only when supplied', () => {
    const testingId = scopedProcedureRequirementId(procedure, 'testing', 'visual-check');
    const model = deriveProcedureWorkspaceModel(assignedJob(), {
      context: { satisfiedRequirementIds: [testingId] },
    });
    const testing = model.steps.flatMap(step => step.requirements).find(requirement => requirement.id === testingId);
    expect(testing?.satisfied).toBe(true);
  });

  it('surfaces unresolved conditional steps as cannot-determine work', () => {
    const conditionalProcedure: ProcedureDefinition = {
      ...procedure,
      steps: [{
        id: 'conditional-blocker',
        title: 'Conditional blocker',
        guidedInstructions: 'Resolve condition.',
        quickCheckpoint: 'Resolve condition.',
        classification: 'conditional',
        displayOrder: 1,
        condition: { type: 'device_type_equals', deviceType: 'pinpad' },
      }],
    };
    const model = deriveProcedureWorkspaceModel(assignedJob(), {
      procedureResolution: { status: 'resolved', procedure: conditionalProcedure },
    });
    expect(model.summary.unresolvedConditionalItems).toBe(1);
    expect(model.steps[0].condition.status).toBe('unresolved');
  });
});

describe('ProcedureWorkspace UI', () => {
  it('renders assigned procedure name and version', async () => {
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: assignedJob() }));
    expect(document.body.textContent).toContain('Generic Field Work v1.0.0');
  });

  it('shows Assign Procedure for unassigned jobs', async () => {
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: makeJob() }));
    expect(document.body.textContent).toContain('No procedure assigned');
    expect(document.body.textContent).toContain('Assign Procedure');
  });

  it('calls assignment action from the catalog selector', async () => {
    const onAssignProcedure = vi.fn((): ProcedureAssignmentResult => ({
      status: 'updated',
      job: assignedJob(),
      errors: [],
      confirmationRequired: false,
    }));
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: makeJob(), onAssignProcedure }));
    clickByText('Generic Field Work v1.0.0 (active)');
    clickByText('Confirm');
    expect(onAssignProcedure).toHaveBeenCalledWith('job-1', expect.objectContaining({
      procedureId: procedure.id,
      procedureVersion: procedure.version,
    }), procedure, false);
  });

  it('requires explicit confirmation when assignment helper reports confirmation_required', async () => {
    const onAssignProcedure = vi
      .fn()
      .mockReturnValueOnce({
        status: 'confirmation_required',
        job: assignedJob(),
        errors: [],
        confirmationRequired: true,
        reason: 'work_started',
      } satisfies ProcedureAssignmentResult)
      .mockReturnValueOnce({
        status: 'updated',
        job: assignedJob(),
        errors: [],
        confirmationRequired: false,
      } satisfies ProcedureAssignmentResult);
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: makeJob(), onAssignProcedure }));
    clickByText('Generic Field Work v1.0.0 (active)');
    clickByText('Confirm');
    expect(document.body.textContent).toContain('need explicit confirmation');
    clickByText('Confirm Procedure Change After Work Started');
    expect(onAssignProcedure).toHaveBeenLastCalledWith('job-1', expect.any(Object), procedure, true);
  });

  it('persists Quick mode preference separately from job data', async () => {
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: assignedJob() }));
    clickByText('Quick');
    expect(localStorage.getItem('route_manager_procedure_workspace_mode_v1')).toBe('quick');
    expect(assignedJob().procedureAssignment?.procedureId).toBe(procedure.id);
  });

  it('routes proof capture with exact procedure requirement identity', async () => {
    const onCaptureProcedureProof = vi.fn();
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: assignedJob(), onCaptureProcedureProof }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(['abc'], 'site.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => {
      input!.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(onCaptureProcedureProof).toHaveBeenCalledWith(assignedJob(), 'photos', [file], expect.objectContaining({
      requirementId: 'site-photo',
      procedureId: procedure.id,
      procedureVersion: procedure.version,
      procedureStepId: 'arrival-context',
    }));
  });

  it('routes inventory recording with exact procedure requirement identity', async () => {
    const onRecordInventoryForRequirement = vi.fn(async () => undefined);
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: assignedJob(), onRecordInventoryForRequirement }));
    const serialInput = document.querySelector<HTMLInputElement>('input[placeholder="Serial"]');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      valueSetter?.call(serialInput, 'ABC123');
      serialInput!.dispatchEvent(new Event('input', { bubbles: true }));
      serialInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    clickByText('Record Inventory');
    await act(async () => Promise.resolve());
    expect(onRecordInventoryForRequirement).toHaveBeenCalledWith(assignedJob(), expect.objectContaining({
      requirementContext: expect.objectContaining({
        requirementId: 'primary-equipment',
        procedureId: procedure.id,
        procedureVersion: procedure.version,
        procedureStepId: 'equipment-identity',
      }),
      serialNumber: 'ABC123',
    }));
  });

  it('renders unresolved assigned procedures as blocking warnings', async () => {
    await renderWorkspace(React.createElement(ProcedureWorkspace, { job: makeJob({
      procedureAssignment: {
        procedureId: 'missing',
        procedureVersion: '1.0.0',
        assignedAt: '2026-08-15T09:00:00.000Z',
        assignmentSource: 'manual',
      },
    }) }));
    expect(document.body.textContent).toContain('Assigned procedure unresolved');
    expect(document.body.textContent).toContain('was not found in the catalog');
  });
});
