import type { JobPreviewGuide } from './types';

const META_KEY = 'job_preview_guides_v1';
const DB_NAME = 'job_preview_media';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';

interface MediaRecord { id: string; jobId: string; kind: 'video' | 'page' | 'thumbnail' | 'preparation'; blob: Blob; createdAt: string }

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Preview storage is unavailable on this device.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
        store.createIndex('jobId', 'jobId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Preview storage could not be opened.'));
  });
  return dbPromise;
}

function readAll(): Record<string, JobPreviewGuide> {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; }
}

export function getPreviewGuide(jobId: string): JobPreviewGuide | null {
  const guide = readAll()[jobId];
  if (!guide) return null;
  if (!Array.isArray(guide.pages) || guide.pages.length === 0) {
    return { ...guide, status: guide.status === 'failed' ? 'failed' : 'empty', stage: 'no_preview', pageIds: [], pages: [] };
  }
  if (guide.summary?.reviewedByUser !== true && ['preparation', 'ready_to_travel', 'travel_planning', 'traveling'].includes(guide.stage)) {
    return { ...guide, stage: 'summary_review' };
  }
  return guide;
}

export function savePreviewGuide(guide: JobPreviewGuide): void {
  const all = readAll();
  all[guide.jobId] = { ...guide, updatedAt: new Date().toISOString() };
  localStorage.setItem(META_KEY, JSON.stringify(all));
}

export async function saveMedia(record: MediaRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    tx.objectStore(MEDIA_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('This phone could not save the preview media. Free storage and try again.'));
  });
}

export async function getMedia(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise(resolve => {
    const request = db.transaction(MEDIA_STORE).objectStore(MEDIA_STORE).get(id);
    request.onsuccess = () => resolve((request.result as MediaRecord | undefined)?.blob || null);
    request.onerror = () => resolve(null);
  });
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>(resolve => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    tx.objectStore(MEDIA_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function deleteGuide(jobId: string): Promise<void> {
  const guide = getPreviewGuide(jobId);
  if (guide) {
    const refs = [guide.sourceVideoRef, ...guide.pages.flatMap(page => [page.imageRef, page.thumbnailRef]), ...guide.preparation.map(p => p.photoRef)].filter(Boolean) as string[];
    await Promise.all(refs.map(deleteMedia));
  }
  const all = readAll();
  delete all[jobId];
  localStorage.setItem(META_KEY, JSON.stringify(all));
}

export async function estimateAvailableStorage(): Promise<{ quota?: number; usage?: number }> {
  return navigator.storage?.estimate ? navigator.storage.estimate() : {};
}

export function _resetPreviewStorageForTests(): void { localStorage.removeItem(META_KEY); dbPromise = null; }
