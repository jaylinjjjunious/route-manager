import { describe, expect, it } from 'vitest';
import { evaluateJobCloseout, evaluateJobCloseoutRequirements } from '../src/features/jobs/jobCloseout';
import type { JobCloseoutRequirement } from '../src/features/jobs/jobCloseoutTypes';
import type { Job } from '../src/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Vons',
    address: '5201 White Ln, Bakersfield, CA',
    pay: 25,
    estimatedMinutes: 30,
    jobType: 'retail_audit',
    dueTime: '17:00',
    notes: '',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3733, lng: -119.0187 },
    ...overrides,
  };
}

describe('job closeout evaluation', () => {
  it('separates satisfied required, missing required, active conditional, warnings, and references', () => {
    const requirements: JobCloseoutRequirement[] = [
      { id: 'proof', kind: 'required', label: 'Upload required proof', satisfied: true },
      { id: 'notes', kind: 'required', label: 'Add completion notes', satisfied: false },
      { id: 'temperature', kind: 'conditional', label: 'Record cooler temperature', active: true, satisfied: false },
      { id: 'inactive', kind: 'conditional', label: 'Inactive conditional', active: false, satisfied: false },
      { id: 'receipt', kind: 'recommended', label: 'Attach receipt', satisfied: false },
      { id: 'policy', kind: 'reference', label: 'Review program notes' },
    ];

    const result = evaluateJobCloseoutRequirements(requirements);

    expect(result.completionAllowed).toBe(false);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toEqual(['proof']);
    expect(result.missingRequiredItems.map(item => item.id)).toEqual(['notes', 'temperature']);
    expect(result.activeConditionalRequirements.map(item => item.id)).toEqual(['temperature']);
    expect(result.warnings.map(item => item.id)).toEqual(['receipt']);
    expect(result.referenceItems.map(item => item.id)).toEqual(['policy']);
  });

  it('does not block completion for recommended or reference items', () => {
    const result = evaluateJobCloseoutRequirements([
      { id: 'receipt', kind: 'recommended', label: 'Attach receipt', satisfied: false },
      { id: 'policy', kind: 'reference', label: 'Review program notes', satisfied: false },
    ]);

    expect(result.completionAllowed).toBe(true);
    expect(result.missingRequiredItems).toHaveLength(0);
    expect(result.warnings.map(item => item.id)).toEqual(['receipt']);
  });

  it('evaluates requirements attached to a job', () => {
    const result = evaluateJobCloseout(makeJob({
      closeoutRequirements: [
        { id: 'proof', kind: 'required', label: 'Upload required proof', satisfied: true },
      ],
    }));

    expect(result.completionAllowed).toBe(true);
    expect(result.satisfiedRequiredItems.map(item => item.id)).toEqual(['proof']);
  });
});
