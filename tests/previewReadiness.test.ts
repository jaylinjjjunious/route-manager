import { describe, expect, it } from 'vitest';
import { effectiveConfirmationMode, incompleteRequiredRequirements, photoCompletionIsValid } from '../src/features/previewGuide/readiness';
import type { PreviewRequirement } from '../src/features/previewGuide/types';

const requirement = (overrides: Partial<PreviewRequirement> = {}): PreviewRequirement => ({
  id: 'req-1', text: 'Bring supplies', type: 'other', confirmationMode: 'review', required: true,
  sourcePageIds: ['page-1'], confidence: .9, ...overrides,
});

describe('Preview Guide readiness invariants', () => {
  it('dress code is always one tap and never camera-driven', () => {
    expect(effectiveConfirmationMode(requirement({ type: 'dress_code', confirmationMode: 'photo' }))).toBe('one_tap');
  });

  it('a printed sell sheet requires photo confirmation', () => {
    const sellSheet = requirement({ text: 'Bring the printed sell sheet', confirmationMode: 'one_tap' });
    expect(effectiveConfirmationMode(sellSheet)).toBe('photo');
    expect(photoCompletionIsValid(sellSheet, { requirementId: sellSheet.id, status: 'complete' })).toBe(false);
    expect(photoCompletionIsValid(sellSheet, { requirementId: sellSheet.id, status: 'complete', photoRef: 'prep-photo' })).toBe(true);
  });

  it('required incomplete items block while optional items do not', () => {
    const required = requirement();
    const optional = requirement({ id: 'req-2', required: false });
    expect(incompleteRequiredRequirements([required, optional], [])).toEqual([required]);
    expect(incompleteRequiredRequirements([required, optional], [{ requirementId: required.id, status: 'complete' }])).toEqual([]);
  });
});
