import { beforeEach, describe, expect, it } from 'vitest';
import { blurScore, grayscaleSignature, signatureDifference, validatePreviewRecording, VIDEO_LIMITS } from '../src/features/previewGuide/frameExtraction';
import { _resetPreviewStorageForTests, getPreviewGuide, savePreviewGuide, saveViewedPreviewGuideSection } from '../src/features/previewGuide/storage';
import { REQUIRED_PREVIEW_GUIDE_SECTION_IDS } from '../src/features/previewGuide/reviewCompletion';
import type { JobPreviewGuide } from '../src/features/previewGuide/types';

const guide = (jobId: string): JobPreviewGuide => ({
  id: `guide-${jobId}`, jobId, status: 'ready', stage: 'preview_ready', sourceType: 'screen_recording',
  pageIds: ['page-1'], pages: [{ id: 'page-1', guideId: `guide-${jobId}`, order: 0, imageRef: 'image-1', thumbnailRef: 'thumb-1', sourceTimeSeconds: 1, status: 'included', selectedForSummary: false, tags: [] }],
  preparation: [], extractionVersion: 1, createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z',
});

beforeEach(() => { localStorage.clear(); _resetPreviewStorageForTests(); });

describe('Preview Guide recording validation', () => {
  it('accepts supported video input and rejects missing/non-video input', () => {
    expect(validatePreviewRecording(new File(['video'], 'preview.mp4', { type: 'video/mp4' }))).toBeNull();
    expect(validatePreviewRecording(null)).toMatch(/Choose/);
    expect(validatePreviewRecording(new File(['x'], 'page.png', { type: 'image/png' }))).toMatch(/video/);
  });

  it('rejects an oversized recording with plain-language recovery', () => {
    const file = new File(['x'], 'preview.mov', { type: 'video/quicktime' });
    Object.defineProperty(file, 'size', { value: VIDEO_LIMITS.maxBytes + 1 });
    expect(validatePreviewRecording(file)).toMatch(/Trim it/);
  });
});

describe('local frame comparison', () => {
  it('treats matching signatures as duplicates and meaningful changes as different', () => {
    const black = new Uint8ClampedArray(4 * 4 * 4);
    const white = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const a = grayscaleSignature(black, 4, 4, 2);
    const b = grayscaleSignature(black, 4, 4, 2);
    const c = grayscaleSignature(white, 4, 4, 2);
    expect(signatureDifference(a, b)).toBe(0);
    expect(signatureDifference(a, c)).toBeGreaterThan(.9);
  });

  it('reports stronger edge detail for a sharp alternating frame', () => {
    const flat = new Uint8ClampedArray(8 * 8 * 4).fill(100);
    const sharp = new Uint8ClampedArray(8 * 8 * 4);
    for (let i = 0; i < sharp.length; i += 4) sharp[i] = sharp[i + 1] = sharp[i + 2] = (i / 4) % 2 ? 255 : 0;
    expect(blurScore(sharp, 8, 8)).toBeGreaterThanOrEqual(blurScore(flat, 8, 8));
  });
});

describe('per-job metadata persistence and migration guards', () => {
  it('keeps guides isolated by job', () => {
    savePreviewGuide(guide('job-1')); savePreviewGuide(guide('job-2'));
    expect(getPreviewGuide('job-1')?.jobId).toBe('job-1');
    expect(getPreviewGuide('job-2')?.jobId).toBe('job-2');
  });

  it('normalizes ready-without-pages to no preview', () => {
    savePreviewGuide({ ...guide('job-1'), pages: [], pageIds: [] });
    expect(getPreviewGuide('job-1')).toMatchObject({ status: 'empty', stage: 'no_preview' });
  });

  it('preserves a failed guide so Road Readiness can block Ride Mode', () => {
    savePreviewGuide({ ...guide('job-1'), status: 'failed', pages: [], pageIds: [] });
    expect(getPreviewGuide('job-1')).toMatchObject({ status: 'failed', stage: 'no_preview' });
  });

  it('does not allow unreviewed summaries to enter preparation', () => {
    savePreviewGuide({ ...guide('job-1'), stage: 'preparation', summary: { beforeYouGo: [], whatYouWillDo: [], proofRequirements: [], warnings: [], referenceTopics: [], uncertainItems: [], sourcePageIds: ['page-1'], generatedAt: '2026-08-02T00:00:00.000Z', reviewedByUser: false } });
    expect(getPreviewGuide('job-1')?.stage).toBe('summary_review');
  });
});

describe('Preview Guide section review completion', () => {
  const unreviewedGuide = (jobId: string): JobPreviewGuide => ({
    ...guide(jobId),
    status: 'needs_review',
    stage: 'summary_review',
    viewedSectionIds: [],
    summary: {
      beforeYouGo: [], whatYouWillDo: [], proofRequirements: [], warnings: [], referenceTopics: [], uncertainItems: [],
      sourcePageIds: ['page-1'], generatedAt: '2026-08-03T00:00:00.000Z', reviewedByUser: false,
    },
  });

  it('does not complete review when the guide is merely opened or partially viewed', () => {
    savePreviewGuide(unreviewedGuide('job-1'));
    expect(getPreviewGuide('job-1')?.summary?.reviewedByUser).toBe(false);

    for (const sectionId of REQUIRED_PREVIEW_GUIDE_SECTION_IDS.slice(0, -1)) {
      saveViewedPreviewGuideSection('job-1', sectionId);
    }

    expect(getPreviewGuide('job-1')).toMatchObject({
      viewedSectionIds: REQUIRED_PREVIEW_GUIDE_SECTION_IDS.slice(0, -1),
      summary: { reviewedByUser: false },
    });
  });

  it('marks review complete only after all five required sections are viewed', () => {
    savePreviewGuide(unreviewedGuide('job-1'));
    for (const sectionId of REQUIRED_PREVIEW_GUIDE_SECTION_IDS) {
      saveViewedPreviewGuideSection('job-1', sectionId);
    }

    expect(getPreviewGuide('job-1')).toMatchObject({
      status: 'ready',
      viewedSectionIds: REQUIRED_PREVIEW_GUIDE_SECTION_IDS,
      summary: { reviewedByUser: true },
    });
  });

  it('persists viewed sections across guide reloads', () => {
    savePreviewGuide(unreviewedGuide('job-1'));
    saveViewedPreviewGuideSection('job-1', 'photos-and-proof');

    expect(getPreviewGuide('job-1')?.viewedSectionIds).toEqual(['photos-and-proof']);
  });

  it('keeps viewed-section progress isolated between jobs', () => {
    savePreviewGuide(unreviewedGuide('job-1'));
    savePreviewGuide(unreviewedGuide('job-2'));
    saveViewedPreviewGuideSection('job-1', 'warnings');

    expect(getPreviewGuide('job-1')?.viewedSectionIds).toEqual(['warnings']);
    expect(getPreviewGuide('job-2')?.viewedSectionIds).toEqual([]);
  });
});
