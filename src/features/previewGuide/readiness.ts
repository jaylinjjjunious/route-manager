import type { ConfirmationMode, PreparationState, PreviewRequirement } from './types';

export function effectiveConfirmationMode(requirement: PreviewRequirement): ConfirmationMode {
  if (requirement.type === 'dress_code') return 'one_tap';
  if (/\bprinted\s+sell\s+sheet\b/i.test(requirement.text)) return 'photo';
  return requirement.confirmationMode;
}

export function incompleteRequiredRequirements(
  requirements: PreviewRequirement[],
  preparation: PreparationState[],
): PreviewRequirement[] {
  return requirements.filter(requirement => requirement.required && !photoCompletionIsValid(
    requirement, preparation.find(state => state.requirementId === requirement.id),
  ));
}

export function photoCompletionIsValid(
  requirement: PreviewRequirement,
  state?: PreparationState,
): boolean {
  if (effectiveConfirmationMode(requirement) !== 'photo') return state?.status === 'complete';
  return state?.status === 'complete' && Boolean(state.photoRef);
}
