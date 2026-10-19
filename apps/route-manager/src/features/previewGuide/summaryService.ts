import { authFetch } from '../../services/apiClient';
import { getMedia } from './storage';
import type { JobPreviewSummary, PreviewPage } from './types';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('A selected page could not be read.'));
    reader.readAsDataURL(blob);
  });
}

export async function createPreviewSummary(pages: PreviewPage[]): Promise<JobPreviewSummary> {
  const selected = pages.filter(page => page.selectedForSummary && page.status === 'included');
  if (!selected.length) throw new Error('Select at least one important page.');
  if (selected.length > 12) throw new Error('Select 12 or fewer pages at a time.');
  const images = await Promise.all(selected.map(async page => {
    const blob = await getMedia(page.imageRef);
    if (!blob) throw new Error('A selected page is missing from this phone.');
    return { pageId: page.id, image: await blobToDataUrl(blob), mimeType: blob.type || 'image/jpeg' };
  }));
  const response = await authFetch('/api/import/preview-summary', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'preview_summary', pages: images }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'The quick summary could not be created.');
  return { ...data, sourcePageIds: selected.map(page => page.id), generatedAt: new Date().toISOString(), reviewedByUser: false } as JobPreviewSummary;
}
