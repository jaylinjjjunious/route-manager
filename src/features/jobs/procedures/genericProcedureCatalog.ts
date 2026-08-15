import type { ProcedureDefinition } from './types';

const timestamp = '2026-08-15T00:00:00.000Z';

export const GENERIC_PROCEDURE_CATALOG: readonly ProcedureDefinition[] = [
  {
    id: 'generic-field-work',
    customerKey: 'generic',
    name: 'Generic Field Work',
    description: 'Reusable generic field-work procedure for technician jobs.',
    version: '1.0.0',
    status: 'active',
    category: 'technician',
    jobType: 'field_task',
    createdAt: timestamp,
    updatedAt: timestamp,
    steps: [
      {
        id: 'arrival-context',
        phaseId: 'arrival',
        phaseLabel: 'Arrival',
        title: 'Confirm site context',
        guidedInstructions: 'Confirm that the visible location, address, and job notes match the assigned job before starting work.',
        quickCheckpoint: 'Confirm location and notes match the job.',
        classification: 'required',
        warningText: 'Do not start work if the location or customer context does not match the assigned job.',
        displayOrder: 10,
        proofRequirements: [
          {
            id: 'site-photo',
            label: 'Site photo',
            proofType: 'photo',
            classification: 'required',
            instructions: 'Capture a clear proof photo showing the work location or relevant job area.',
            visitScope: 'any_visit',
            minimumCount: 1,
          },
        ],
      },
      {
        id: 'equipment-identity',
        phaseId: 'work',
        phaseLabel: 'Work',
        title: 'Record equipment identity',
        guidedInstructions: 'Record the device, model, or equipment identifier that matters for this field-work task.',
        quickCheckpoint: 'Record required equipment identity.',
        classification: 'required',
        displayOrder: 20,
        equipmentRequirements: [
          {
            id: 'primary-equipment',
            label: 'Primary equipment or serial',
            deviceModel: 'Generic device/equipment',
            quantity: 1,
            serialRequirement: 'single',
            classification: 'required',
            visitScope: 'any_visit',
          },
        ],
      },
      {
        id: 'validation-check',
        phaseId: 'validation',
        phaseLabel: 'Validation',
        title: 'Run validation check',
        guidedInstructions: 'Run the appropriate generic validation for this job and acknowledge only after the check is complete.',
        quickCheckpoint: 'Validation check completed.',
        classification: 'recommended',
        displayOrder: 30,
        testingRequirements: [
          {
            id: 'visual-check',
            label: 'Visual verification',
            validationType: 'visual_verification',
            classification: 'recommended',
            instructions: 'Verify the visible work result matches the job expectation.',
          },
        ],
      },
      {
        id: 'support-reference',
        phaseId: 'support',
        phaseLabel: 'Support',
        title: 'Escalate if blocked',
        guidedInstructions: 'Use normal support escalation only when the job cannot move forward with available information.',
        quickCheckpoint: 'Escalate only if blocked.',
        classification: 'reference',
        displayOrder: 40,
        supportEscalations: [
          {
            id: 'generic-support',
            escalationLabel: 'Generic support escalation',
            contactRoleType: 'dispatcher',
            instructions: 'Contact the appropriate support role for the job source. Do not use customer-specific contact details here.',
            conditional: true,
            condition: { type: 'blocker_present' },
          },
        ],
      },
    ],
  },
];
