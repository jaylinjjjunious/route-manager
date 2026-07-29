export type CustodyEventType = 'receive_in' | 'install' | 'removal' | 'return';
export type CustodyItemStatus = 'received' | 'installed' | 'removed' | 'returned';
export type CustodyEvidenceKind = 'photo' | 'document' | 'receipt';
export type CustodySyncStatus = 'queued' | 'synced' | 'failed';

export interface CustodyCoordinates {
  lat: number;
  lng: number;
}

export interface CustodyEvidence {
  id: string;
  kind: CustodyEvidenceKind;
  name: string;
  mimeType: string;
  dataUrl?: string;
  capturedAt: string;
}

export interface CustodyEvent {
  id: string;
  jobId: string;
  itemId: string;
  type: CustodyEventType;
  occurredAt: string;
  partNumber: string;
  serialNumber: string;
  coordinates?: CustodyCoordinates;
  evidenceIds: string[];
  receiptNumber?: string;
  trackingNumber?: string;
  notes?: string;
  previousHash: string;
  hash: string;
  syncStatus: CustodySyncStatus;
}

export interface CustodyItem {
  id: string;
  jobId: string;
  partNumber: string;
  serialNumber: string;
  status: CustodyItemStatus;
  evidence: CustodyEvidence[];
  eventIds: string[];
  updatedAt: string;
}

export interface CustodyLedger {
  version: 1;
  jobId: string;
  items: CustodyItem[];
  events: CustodyEvent[];
}

const LEDGER_PREFIX = 'inventory_custody_ledger_v1:';
const QUEUE_KEY = 'inventory_custody_sync_queue_v1';
const GENESIS_HASH = 'GENESIS';

function getLedgerKey(jobId: string): string {
  return `${LEDGER_PREFIX}${jobId}`;
}

function randomId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The UI remains usable when browser storage is unavailable.
  }
}

function canonicalEvent(event: Omit<CustodyEvent, 'hash'>): string {
  return JSON.stringify({
    id: event.id,
    jobId: event.jobId,
    itemId: event.itemId,
    type: event.type,
    occurredAt: event.occurredAt,
    partNumber: event.partNumber,
    serialNumber: event.serialNumber,
    coordinates: event.coordinates || null,
    evidenceIds: event.evidenceIds,
    receiptNumber: event.receiptNumber || null,
    trackingNumber: event.trackingNumber || null,
    notes: event.notes || null,
    previousHash: event.previousHash,
  });
}

async function digest(value: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function emptyCustodyLedger(jobId: string): CustodyLedger {
  return { version: 1, jobId, items: [], events: [] };
}

export function loadCustodyLedger(jobId: string): CustodyLedger {
  const ledger = readJson<CustodyLedger | null>(getLedgerKey(jobId), null);
  if (!ledger || ledger.version !== 1 || ledger.jobId !== jobId) return emptyCustodyLedger(jobId);
  return {
    version: 1,
    jobId,
    items: Array.isArray(ledger.items) ? ledger.items : [],
    events: Array.isArray(ledger.events) ? ledger.events : [],
  };
}

export function saveCustodyLedger(ledger: CustodyLedger): void {
  writeJson(getLedgerKey(ledger.jobId), ledger);
}

export function loadSyncQueue(): CustodyEvent[] {
  return readJson<CustodyEvent[]>(QUEUE_KEY, []).filter(Boolean);
}

function saveSyncQueue(queue: CustodyEvent[]): void {
  writeJson(QUEUE_KEY, queue);
}

export function requestInventoryBackgroundSync(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.ready
    .then(registration => {
      const syncManager = (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
      return syncManager?.register('inventory-custody-sync');
    })
    .catch(() => undefined);
}

export async function getCurrentCoordinates(): Promise<CustodyCoordinates | undefined> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 4500, maximumAge: 30_000 },
    );
  });
}

export async function createCustodyEvent(input: {
  jobId: string;
  itemId: string;
  type: CustodyEventType;
  partNumber: string;
  serialNumber: string;
  previousHash?: string;
  coordinates?: CustodyCoordinates;
  evidenceIds?: string[];
  receiptNumber?: string;
  trackingNumber?: string;
  notes?: string;
}): Promise<CustodyEvent> {
  const eventWithoutHash: Omit<CustodyEvent, 'hash'> = {
    id: randomId('custody-event'),
    jobId: input.jobId,
    itemId: input.itemId,
    type: input.type,
    occurredAt: new Date().toISOString(),
    partNumber: input.partNumber.trim(),
    serialNumber: input.serialNumber.trim(),
    coordinates: input.coordinates,
    evidenceIds: input.evidenceIds || [],
    receiptNumber: input.receiptNumber?.trim() || undefined,
    trackingNumber: input.trackingNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    previousHash: input.previousHash || GENESIS_HASH,
    syncStatus: 'queued',
  };
  return { ...eventWithoutHash, hash: await digest(canonicalEvent(eventWithoutHash)) };
}

export function appendCustodyEvent(ledger: CustodyLedger, event: CustodyEvent, item: CustodyItem): CustodyLedger {
  const nextItem: CustodyItem = {
    ...item,
    status: event.type === 'receive_in' ? 'received' : event.type === 'install' ? 'installed' : event.type === 'removal' ? 'removed' : 'returned',
    eventIds: [...item.eventIds, event.id],
    evidence: [...item.evidence],
    updatedAt: event.occurredAt,
  };
  const next = {
    ...ledger,
    items: ledger.items.some(existing => existing.id === item.id)
      ? ledger.items.map(existing => existing.id === item.id ? nextItem : existing)
      : [...ledger.items, nextItem],
    events: [...ledger.events, event],
  };
  saveCustodyLedger(next);
  saveSyncQueue([...loadSyncQueue(), event]);
  requestInventoryBackgroundSync();
  return next;
}

export async function verifyCustodyLedger(ledger: CustodyLedger): Promise<{ valid: boolean; brokenEventId?: string }> {
  let previousHash = GENESIS_HASH;
  for (const event of ledger.events) {
    if (event.previousHash !== previousHash) return { valid: false, brokenEventId: event.id };
    const expectedHash = await digest(canonicalEvent(event));
    if (expectedHash !== event.hash) return { valid: false, brokenEventId: event.id };
    previousHash = event.hash;
  }
  return { valid: true };
}

export async function flushCustodySyncQueue(): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, remaining: loadSyncQueue().length };
  const queue = loadSyncQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };
  try {
    const { authFetchJson } = await import('../apiClient');
    await authFetchJson('/api/inventory/custody-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: queue }),
    });
    const syncedIds = new Set(queue.map(event => event.id));
    saveSyncQueue(loadSyncQueue().filter(event => !syncedIds.has(event.id)));
    return { synced: queue.length, remaining: loadSyncQueue().length };
  } catch {
    return { synced: 0, remaining: loadSyncQueue().length };
  }
}

export function fileToCustodyEvidence(file: File, kind: CustodyEvidenceKind): Promise<CustodyEvidence> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: randomId('custody-evidence'),
      kind,
      name: file.name || `${kind}-${Date.now()}`,
      mimeType: file.type || 'application/octet-stream',
      dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      capturedAt: new Date().toISOString(),
    });
    reader.onerror = () => reject(reader.error || new Error('Could not read evidence file'));
    reader.readAsDataURL(file);
  });
}

export { GENESIS_HASH };
