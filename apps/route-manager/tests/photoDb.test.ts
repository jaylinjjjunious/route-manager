import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  savePhotoBlob,
  getPhotoBlob,
  deletePhotoBlob,
  getStorageStats,
  migrateFromLocalStorage,
  cleanupOldBlobs,
  _resetDbInstanceForTesting,
} from '../src/services/scan/photoDb';

const stores = {
  photo_blobs: new Map<string, any>(),
  photo_meta: new Map<string, any>(),
};

function makeReq(result: any) {
  const req = { result, onsuccess: null as any, onerror: null as any, error: null };
  queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
  return req;
}

function makeStore(target: Map<string, any>) {
  return {
    put: (record: any) => { target.set(record.id, record); },
    get: (id: string) => makeReq(target.get(id)),
    delete: (id: string) => { target.delete(id); },
    count: () => makeReq(target.size),
    index: () => ({
      getAll: () => makeReq(Array.from(target.values())),
    }),
  };
}

function toArray(val: string | string[]): string[] {
  return Array.isArray(val) ? val : [val];
}

beforeEach(() => {
  _resetDbInstanceForTesting();
  stores.photo_blobs.clear();
  stores.photo_meta.clear();

  (globalThis as any).indexedDB = {
    open: vi.fn(() => {
      const db = {
        objectStoreNames: { contains: () => true },
        transaction: (storeNames: string | string[], _mode?: string) => {
          const names = toArray(storeNames);
          const map: Record<string, any> = {};
          for (const n of names) {
            map[n] = makeStore(stores[n as keyof typeof stores] || new Map());
          }
          const tx = {
            objectStore: (n: string) => map[n],
            oncomplete: null as (() => void) | null,
            onerror: null as (() => void) | null,
            error: null,
          };
          queueMicrotask(() => { if (tx.oncomplete) tx.oncomplete(); });
          return tx;
        },
        close: vi.fn(),
        onversionchange: null,
      };
      const req = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null, error: null };
      queueMicrotask(() => { if (req.onsuccess) req.onsuccess({ target: req } as any); });
      return req;
    }),
  };
});

describe('photoDb', () => {
  it('savePhotoBlob and getPhotoBlob round-trip', async () => {
    await savePhotoBlob('photo-1', 'session-1', 'data:image/fake', 'data:image/analysis', '2026-01-01T00:00:00Z');
    const result = await getPhotoBlob('photo-1');
    expect(result).not.toBeNull();
    expect(result!.dataUrl).toBe('data:image/fake');
    expect(result!.analysisDataUrl).toBe('data:image/analysis');
  });

  it('getPhotoBlob returns null for nonexistent id', async () => {
    const result = await getPhotoBlob('nonexistent');
    expect(result).toBeNull();
  });

  it('deletePhotoBlob removes the blob', async () => {
    await savePhotoBlob('photo-2', 'session-1', 'data:image/fake', 'data:image/analysis', '2026-01-01');
    await deletePhotoBlob('photo-2');
    const result = await getPhotoBlob('photo-2');
    expect(result).toBeNull();
  });

  it('getStorageStats returns counts', async () => {
    await savePhotoBlob('p1', 's1', 'data:image/fake1', 'data:image/a1', '2026-01-01');
    await savePhotoBlob('p2', 's1', 'data:image/fake2', 'data:image/a2', '2026-01-02');
    const stats = await getStorageStats();
    expect(stats.idbBlobCount).toBeGreaterThanOrEqual(2);
    expect(stats.idbMetaCount).toBeGreaterThanOrEqual(2);
  });

  it('migrateFromLocalStorage handles empty localStorage', async () => {
    localStorage.removeItem('smart_aisle_scan_photos');
    localStorage.removeItem('smart_aisle_scan_db_migrated');
    const result = await migrateFromLocalStorage();
    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('cleanupOldBlobs returns count', async () => {
    const count = await cleanupOldBlobs();
    expect(typeof count).toBe('number');
  });
});
