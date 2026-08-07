import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authFetch, getMedia } = vi.hoisted(() => ({ authFetch: vi.fn(), getMedia: vi.fn() }));
vi.mock('../src/services/apiClient', () => ({ authFetch }));
vi.mock('../src/features/previewGuide/storage', () => ({ getMedia }));

import { createPreviewSummary } from '../src/features/previewGuide/summaryService';
import type { PreviewPage } from '../src/features/previewGuide/types';

const page = (id: string, selected: boolean): PreviewPage => ({ id, guideId: 'guide', order: Number(id.at(-1)), imageRef: `image-${id}`, thumbnailRef: `thumb-${id}`, sourceTimeSeconds: 1, status: 'included', selectedForSummary: selected, tags: [] });

beforeEach(() => {
  authFetch.mockReset(); getMedia.mockReset();
  getMedia.mockResolvedValue(new Blob(['image'], { type: 'image/jpeg' }));
  authFetch.mockResolvedValue(new Response(JSON.stringify({ beforeYouGo: [], whatYouWillDo: [], proofRequirements: [], warnings: [], referenceTopics: [], uncertainItems: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
});

describe('targeted Preview Guide summary', () => {
  it('uploads only selected pages and never a video', async () => {
    const result = await createPreviewSummary([page('page-1', true), page('page-2', false)]);
    expect(getMedia).toHaveBeenCalledTimes(1);
    const [, init] = authFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.pages.map((item: any) => item.pageId)).toEqual(['page-1']);
    expect(JSON.stringify(body)).not.toContain('video');
    expect(result.sourcePageIds).toEqual(['page-1']);
    expect(result.reviewedByUser).toBe(false);
  });

  it('requires an explicit page selection', async () => {
    await expect(createPreviewSummary([page('page-1', false)])).rejects.toThrow(/Select at least one/);
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('limits large selections before network use', async () => {
    await expect(createPreviewSummary(Array.from({ length: 13 }, (_, i) => page(`page-${i}`, true)))).rejects.toThrow(/12 or fewer/);
    expect(authFetch).not.toHaveBeenCalled();
  });
});
