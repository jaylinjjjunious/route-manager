/**
 * IndexedDB persistence layer for Smart Aisle Scan photo blobs.
 *
 * Stores full-resolution and analysis-resolution image data in IndexedDB
 * while keeping metadata in localStorage for fast synchronous reads.
 * Provides migration from pure-localStorage storage and auto-cleanup
 * of data older than RETENTION_DAYS.
 */

import type { AisleScanPhoto } from '../../types';

const DB_NAME = 'smart_aisle_scan_db';
const DB_VERSION = 2;
const BLOB_STORE = 'photo_blobs';
const META_STORE = 'photo_meta';
const RETENTION_DAYS = 30;
const MIGRATION_KEY = 'smart_aisle_scan_db_migrated';

// ─── Database Initialization ──────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

/** Reset the cached database instance (for testing). */
export function _resetDbInstanceForTesting(): void {
  if (dbInstance) {
    try { dbInstance.close(); } catch {}
    dbInstance = null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        const metaStore = db.createObjectStore(META_STORE, { keyPath: 'id' });
        metaStore.createIndex('sessionId', 'sessionId', { unique: false });
        metaStore.createIndex('capturedAt', 'capturedAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
    };
  });
}

// ─── Blob CRUD ────────────────────────────────────────────────────

interface PhotoBlobRecord {
  id: string;
  sessionId: string;
  dataUrl: string;
  analysisDataUrl: string;
  capturedAt: string;
}

interface PhotoMetaRecord {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  role: string;
  capturedAt: string;
  width: number;
  height: number;
  isActive: boolean;
}

export async function savePhotoBlob(
  photoId: string,
  sessionId: string,
  dataUrl: string,
  analysisDataUrl: string,
  capturedAt: string,
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    const blobStore = tx.objectStore(BLOB_STORE);
    const metaStore = tx.objectStore(META_STORE);

    blobStore.put({ id: photoId, sessionId, dataUrl, analysisDataUrl, capturedAt } as PhotoBlobRecord);
    metaStore.put({ id: photoId, sessionId, sequenceNumber: 0, role: '', capturedAt, width: 0, height: 0, isActive: true } as PhotoMetaRecord);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`IndexedDB save failed: ${tx.error?.message}`));
    });
  } catch {
    // IndexedDB unavailable — localStorage fallback handles persistence
  }
}

export async function updatePhotoMeta(
  photoId: string,
  updates: Partial<PhotoMetaRecord>,
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);

    const getReq = store.get(photoId);
    getReq.onsuccess = () => {
      const existing = getReq.result as PhotoMetaRecord | undefined;
      if (existing) {
        store.put({ ...existing, ...updates });
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`IndexedDB meta update failed: ${tx.error?.message}`));
    });
  } catch {
    // Ignore
  }
}

export async function getPhotoBlob(photoId: string): Promise<{ dataUrl: string; analysisDataUrl: string } | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(BLOB_STORE, 'readonly');
    const store = tx.objectStore(BLOB_STORE);

    return new Promise((resolve) => {
      const req = store.get(photoId);
      req.onsuccess = () => {
        const result = req.result as PhotoBlobRecord | undefined;
        resolve(result ? { dataUrl: result.dataUrl, analysisDataUrl: result.analysisDataUrl } : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deletePhotoBlob(photoId: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).delete(photoId);
    tx.objectStore(META_STORE).delete(photoId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

export async function deleteSessionBlobs(sessionId: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    const blobStore = tx.objectStore(BLOB_STORE);
    const metaStore = tx.objectStore(META_STORE);

    // Delete all blobs for this session using index
    const metaIndex = metaStore.index('sessionId');
    const getAllReq = metaIndex.getAll(IDBKeyRange.only(sessionId));
    getAllReq.onsuccess = () => {
      const records = getAllReq.result as PhotoMetaRecord[];
      for (const record of records) {
        blobStore.delete(record.id);
        metaStore.delete(record.id);
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────

export async function cleanupOldBlobs(): Promise<number> {
  let deletedCount = 0;
  try {
    const db = await openDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffIso = cutoff.toISOString();

    const tx = db.transaction([BLOB_STORE, META_STORE], 'readwrite');
    const blobStore = tx.objectStore(BLOB_STORE);
    const metaStore = tx.objectStore(META_STORE);
    const metaIndex = metaStore.index('capturedAt');

    const range = IDBKeyRange.upperBound(cutoffIso);
    const getAllReq = metaIndex.getAll(range);
    getAllReq.onsuccess = () => {
      const oldRecords = getAllReq.result as PhotoMetaRecord[];
      for (const record of oldRecords) {
        blobStore.delete(record.id);
        metaStore.delete(record.id);
        deletedCount++;
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
  return deletedCount;
}

// ─── localStorage → IndexedDB Migration ───────────────────────────

export async function migrateFromLocalStorage(): Promise<{ migrated: number; skipped: number }> {
  let migrated = 0;
  let skipped = 0;

  try {
    if (localStorage.getItem(MIGRATION_KEY) === 'done') {
      return { migrated: 0, skipped: 0 };
    }

    const raw = localStorage.getItem('smart_aisle_scan_photos');
    if (!raw) {
      localStorage.setItem(MIGRATION_KEY, 'done');
      return { migrated: 0, skipped: 0 };
    }

    const photos: Record<string, AisleScanPhoto> = JSON.parse(raw);
    const entries = Object.entries(photos);

    if (entries.length === 0) {
      localStorage.setItem(MIGRATION_KEY, 'done');
      return { migrated: 0, skipped: 0 };
    }

    for (const [photoId, photo] of entries) {
      if (!photo.dataUrl || photo.dataUrl.length < 100) {
        skipped++;
        continue;
      }
      try {
        await savePhotoBlob(photoId, photo.sessionId, photo.dataUrl, photo.analysisDataUrl, photo.capturedAt);
        migrated++;
      } catch {
        skipped++;
      }
    }

    localStorage.setItem(MIGRATION_KEY, 'done');
  } catch {
    // Migration failure is non-fatal
  }

  return { migrated, skipped };
}

// ─── Storage Stats ────────────────────────────────────────────────

export async function getStorageStats(): Promise<{
  idbBlobCount: number;
  idbMetaCount: number;
  localStoragePhotoSizeKB: number;
}> {
  let idbBlobCount = 0;
  let idbMetaCount = 0;

  try {
    const db = await openDatabase();
    const tx = db.transaction([BLOB_STORE, META_STORE], 'readonly');

    idbBlobCount = await new Promise<number>((resolve) => {
      const req = tx.objectStore(BLOB_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    idbMetaCount = await new Promise<number>((resolve) => {
      const req = tx.objectStore(META_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    // Ignore
  }

  let localStoragePhotoSizeKB = 0;
  try {
    const raw = localStorage.getItem('smart_aisle_scan_photos');
    if (raw) {
      localStoragePhotoSizeKB = Math.round(new Blob([raw]).size / 1024);
    }
  } catch {
    // Ignore
  }

  return { idbBlobCount, idbMetaCount, localStoragePhotoSizeKB };
}
