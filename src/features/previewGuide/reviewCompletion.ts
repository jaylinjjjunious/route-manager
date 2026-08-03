import type { JobPreviewGuide, PreviewGuideSectionId } from './types';

export const REQUIRED_PREVIEW_GUIDE_SECTION_IDS: readonly PreviewGuideSectionId[] = [
  'what-youre-doing',
  'questions-youll-answer',
  'photos-and-proof',
  'warnings',
  'how-to-complete',
];

export function hasCompletedPreviewGuideReview(viewedSectionIds: readonly PreviewGuideSectionId[] = []): boolean {
  return REQUIRED_PREVIEW_GUIDE_SECTION_IDS.every(sectionId => viewedSectionIds.includes(sectionId));
}

export function markPreviewGuideSectionViewed(
  guide: JobPreviewGuide,
  sectionId: PreviewGuideSectionId,
): JobPreviewGuide {
  const viewedSectionIds = guide.viewedSectionIds?.includes(sectionId)
    ? guide.viewedSectionIds
    : [...(guide.viewedSectionIds || []), sectionId];
  const reviewComplete = hasCompletedPreviewGuideReview(viewedSectionIds);

  return {
    ...guide,
    viewedSectionIds,
    status: reviewComplete ? 'ready' : guide.status,
    summary: guide.summary ? { ...guide.summary, reviewedByUser: guide.summary.reviewedByUser || reviewComplete } : guide.summary,
    lastReviewedAt: reviewComplete ? guide.lastReviewedAt || new Date().toISOString() : guide.lastReviewedAt,
  };
}
