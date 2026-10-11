import { canonicalEvent, digest, verifyCustodyLedger } from './integrity';
export { verifyCustodyLedger } from './integrity';
import type { InventoryDomain } from './domain';
import { getStorageOwner, getStorageOwnerEpoch } from '../../utils/ownerStorage';

export type CustodyEventType = 'receive_in' | 'install' | 'removal' | 'return';
export type CustodyItemStatus = 'received' | 'installed' | 'removed' | 'returned';
export type CustodyEvidenceKind = 'photo' | 'document' | 'receipt';
export type CustodySyncStatus = 'queued' | 'synced' | 'failed';
export type CustodyRequirementRole = 'assigned_item' | 'installed_item' | 'removed_item' | 'return_item' | 'serial_capture';

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
  domain: InventoryDomain;
  integrityVersion?: 1 | 2 | 3 | 4;
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
  packageId?: string;
  packageContents?: string;
  equipmentLabel?: string;
  sourceContext?: string;
  requirementId?: string;
  procedureId?: string;
  procedureVersion?: string;
  procedureStepId?: string;
  visitId?: string;
  requirementRole?: CustodyRequirementRole;
  previousHash: string;
  hash: string;
  syncStatus: CustodySyncStatus;
}

export interface CustodyItem {
  domain: InventoryDomain;
  id: string;
  jobId: string;
  partNumber: string;
  serialNumber: string;
  packageId?: string;
  packageContents?: string;
  equipmentLabel?: string;
  sourceContext?: string;
  requirementId?: string;
  procedureId?: string;
  procedureVersion?: string;
  procedureStepId?: string;
  visitId?: string;
  requirementRole?: CustodyRequirementRole;
  status: CustodyItemStatus;
  evidence: CustodyEvidence[];
  eventIds: string[];
  updatedAt: string;
}

export interface CustodyLedger {
  storeName?: string;
  address?: string;
  ownerId?: string;
  ownerEpoch?: number;
  version: 1;
  jobId: string;
  domain: InventoryDomain;
  items: CustodyItem[];
  events: CustodyEvent[];
}

const LEDGER_PREFIX = 'inventory_custody_ledger_v2:';
const LEGACY_LEDGER_PREFIX = 'inventory_custody_ledger_v1:';
const QUEUE_PREFIX = 'inventory_custody_sync_queue_v2:';

const GENESIS_HASH = 'GENESIS';

function getLedgerKey(jobId: string, domain: InventoryDomain): string {
  return `${LEDGER_PREFIX}${domain}:${jobId}:${getStorageOwner() || 'signed-out'}`;
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
    throw new Error('Device storage is full or unavailable. Inventory could not be saved; keep the evidence and retry.');
  }
}

export function emptyCustodyLedger(jobId: string, domain: InventoryDomain = 'merchandising'): CustodyLedger {
  return { version: 1, jobId, domain, ownerId: getStorageOwner() || undefined, ownerEpoch: getStorageOwnerEpoch(), items: [], events: [] };
}

export function loadCustodyLedger(jobId: string, domain: InventoryDomain = 'merchandising'): CustodyLedger {
  const currentLedger = readJson<CustodyLedger | null>(getLedgerKey(jobId, domain), null);
  const ledger = currentLedger;
  if (!ledger || ledger.version !== 1 || ledger.jobId !== jobId) return emptyCustodyLedger(jobId, domain);
  const items = Array.isArray(ledger.items) ? ledger.items.map(item => ({ ...item, domain })) : [];
  const events = Array.isArray(ledger.events) ? ledger.events.map(event => ({ ...event, domain, integrityVersion: event.integrityVersion || (currentLedger ? 2 : 1) })) : [];
  return {
    ...ledger,
    version: 1,
    ownerId: getStorageOwner() || undefined,
    ownerEpoch: getStorageOwnerEpoch(),
    jobId,
    domain,
    items,
    events,
  };
}

export function saveCustodyLedger(ledger: CustodyLedger): void {
  if (!getStorageOwner() || ledger.ownerId !== getStorageOwner() || ledger.ownerEpoch !== getStorageOwnerEpoch()) return;
  writeJson(getLedgerKey(ledger.jobId, ledger.domain), ledger);
}

function getQueueKey(domain: InventoryDomain): string {
  return `${QUEUE_PREFIX}${domain}:${getStorageOwner() || 'signed-out'}`;
}

export function loadSyncQueue(domain: InventoryDomain = 'merchandising'): CustodyEvent[] {
  const current = readJson<CustodyEvent[]>(getQueueKey(domain), []).filter(Boolean).map(event => ({ ...event, domain }));
  return current;
}

function saveSyncQueue(queue: CustodyEvent[], domain: InventoryDomain): void {
  writeJson(getQueueKey(domain), queue);
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
  domain?: InventoryDomain;
  previousHash?: string;
  coordinates?: CustodyCoordinates;
  evidenceIds?: string[];
  receiptNumber?: string;
  trackingNumber?: string;
  notes?: string;
  packageId?: string;
  packageContents?: string;
  equipmentLabel?: string;
  sourceContext?: string;
  requirementId?: string;
  procedureId?: string;
  procedureVersion?: string;
  procedureStepId?: string;
  visitId?: string;
  requirementRole?: CustodyRequirementRole;
}): Promise<CustodyEvent> {
  const domain = input.domain || 'merchandising';
  const eventWithoutHash: Omit<CustodyEvent, 'hash'> = {
    id: randomId('custody-event'),
    jobId: input.jobId,
    itemId: input.itemId,
    type: input.type,
    domain,
    integrityVersion: 4,
    occurredAt: new Date().toISOString(),
    partNumber: input.partNumber.trim(),
    serialNumber: input.serialNumber.trim(),
    coordinates: input.coordinates,
    evidenceIds: input.evidenceIds || [],
    receiptNumber: input.receiptNumber?.trim() || undefined,
    trackingNumber: input.trackingNumber?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    packageId: input.packageId?.trim() || undefined,
    packageContents: input.packageContents?.trim() || undefined,
    equipmentLabel: input.equipmentLabel?.trim() || undefined,
    sourceContext: input.sourceContext?.trim() || undefined,
    requirementId: input.requirementId?.trim() || undefined,
    procedureId: input.procedureId?.trim() || undefined,
    procedureVersion: input.procedureVersion?.trim() || undefined,
    procedureStepId: input.procedureStepId?.trim() || undefined,
    visitId: input.visitId?.trim() || undefined,
    requirementRole: input.requirementRole,
    previousHash: input.previousHash || GENESIS_HASH,
    syncStatus: 'queued',
  };
  return { ...eventWithoutHash, hash: await digest(canonicalEvent(eventWithoutHash)) };
}

export function appendCustodyEvent(ledger: CustodyLedger, event: CustodyEvent, item: CustodyItem): CustodyLedger {
  if (!getStorageOwner() || ledger.ownerId !== getStorageOwner() || ledger.ownerEpoch !== getStorageOwnerEpoch()) return ledger;
  const nextItem: CustodyItem = {
    ...item,
    domain: ledger.domain,
    status: event.type === 'receive_in' ? 'received' : event.type === 'install' ? 'installed' : event.type === 'removal' ? 'removed' : 'returned',
    eventIds: [...item.eventIds, event.id],
    evidence: [...item.evidence],
    updatedAt: event.occurredAt,
    requirementId: event.requirementId ?? item.requirementId,
    procedureId: event.procedureId ?? item.procedureId,
    procedureVersion: event.procedureVersion ?? item.procedureVersion,
    procedureStepId: event.procedureStepId ?? item.procedureStepId,
    visitId: event.visitId ?? item.visitId,
    requirementRole: event.requirementRole ?? item.requirementRole,
  };
  const next = {
    ...ledger,
    items: ledger.items.some(existing => existing.id === item.id)
      ? ledger.items.map(existing => existing.id === item.id ? nextItem : existing)
      : [...ledger.items, nextItem],
    events: [...ledger.events, event],
  };
  saveCustodyLedger(next);
  saveSyncQueue([...loadSyncQueue(ledger.domain), event], ledger.domain);
  requestInventoryBackgroundSync();
  return next;
}

export function hasLegacyCustodyLedger(jobId: string, domain: InventoryDomain): boolean {
  const legacy = readJson<CustodyLedger | null>(`${LEDGER_PREFIX}${domain}:${jobId}`, null)
    || (domain === 'merchandising' ? readJson<CustodyLedger | null>(`${LEGACY_LEDGER_PREFIX}${jobId}`, null) : null);
  return !!legacy?.events?.length;
}

export async function importLegacyCustodyLedger(jobId: string, domain: InventoryDomain): Promise<CustodyLedger> {
  const owner = getStorageOwner();
  const epoch = getStorageOwnerEpoch();
  if (!owner) throw new Error('Sign in before importing inventory.');
  if (loadCustodyLedger(jobId, domain).events.length) throw new Error('This account already has inventory history. Preserve the old records for separate review.');
  const raw = readJson<CustodyLedger | null>(`${LEDGER_PREFIX}${domain}:${jobId}`, null)
    || (domain === 'merchandising' ? readJson<CustodyLedger | null>(`${LEGACY_LEDGER_PREFIX}${jobId}`, null) : null);
  if (!raw) throw new Error('No old inventory found.');
  const ledger = { ...raw, domain, ownerId: owner, ownerEpoch: epoch,
    items: raw.items.map(item => ({ ...item, domain })),
    events: raw.events.map(event => ({ ...event, domain, integrityVersion: event.integrityVersion || (raw.domain ? 2 : 1), syncStatus: 'queued' as const })) };
  if (!(await verifyCustodyLedger(ledger)).valid) throw new Error('Old inventory history needs review before import.');
  if (getStorageOwner() !== owner || getStorageOwnerEpoch() !== epoch) throw new Error('Account changed. Retry after signing in.');
  saveCustodyLedger(ledger);
  saveSyncQueue([...loadSyncQueue(domain), ...ledger.events], domain);
  return ledger;
}

export function custodyPrefix(shorter: CustodyLedger, longer: CustodyLedger): boolean {
  return shorter.events.every((event, index) => longer.events[index]?.id === event.id && longer.events[index]?.hash === event.hash);
}

const inventorySyncs = new Map<string, Promise<CustodyLedger>>();
let inventorySyncQueue: Promise<unknown> = Promise.resolve();
export function syncCustodyLedger(jobId: string, domain: InventoryDomain, jobInfo?: { storeName: string; address: string }): Promise<CustodyLedger> {
  const owner = getStorageOwner(), epoch = getStorageOwnerEpoch();
  const key = `${getStorageOwnerEpoch()}:${getStorageOwner()}:${domain}:${jobId}`;
  const current = inventorySyncs.get(key);
  if (current) return current;
  const task = inventorySyncQueue.then(() => {
    if (getStorageOwner() !== owner || getStorageOwnerEpoch() !== epoch) throw new Error('Account changed. Retry after signing in.');
    return syncCustodyLedgerOnce(jobId, domain, jobInfo);
  }).finally(() => { inventorySyncs.delete(key); });
  inventorySyncQueue = task.catch(() => undefined);
  inventorySyncs.set(key, task);
  return task;
}

async function syncCustodyLedgerOnce(jobId: string, domain: InventoryDomain, jobInfo?: { storeName: string; address: string }): Promise<CustodyLedger> {
  const owner = getStorageOwner();
  const epoch = getStorageOwnerEpoch();
  if (!owner) throw new Error('Sign in to sync inventory.');
  if (!navigator.onLine) throw new Error('Offline. Inventory remains saved on this device.');
  const { authFetchJson } = await import('../apiClient');
  const signal = AbortSignal.timeout(20_000);
  const query = new URLSearchParams({ jobId, domain, expectedOwnerId: owner });
  const remote = await authFetchJson<{ ledger: CustodyLedger | null }>(`/api/inventory/custody-ledger?${query}`, { signal });
  if (getStorageOwner() !== owner || getStorageOwnerEpoch() !== epoch) throw new Error('Account changed. Retry after signing in.');
  let local = loadCustodyLedger(jobId, domain);
  if (remote.ledger) {
    if (remote.ledger.jobId !== jobId || remote.ledger.domain !== domain || remote.ledger.ownerId !== owner
      || !(await verifyCustodyLedger(remote.ledger)).valid) throw new Error('Account inventory history needs review.');
    if (getStorageOwner() !== owner || getStorageOwnerEpoch() !== epoch) throw new Error('Account changed. Retry after signing in.');
    local = loadCustodyLedger(jobId, domain);
    if (!custodyPrefix(remote.ledger, local)) {
      if (!custodyPrefix(local, remote.ledger)) throw new Error('Inventory conflict: both copies were changed. Both histories are preserved; review before syncing.');
      local = { ...remote.ledger, ownerEpoch: epoch };
      saveCustodyLedger(local);
    }
  }
  if (jobInfo) { local = { ...local, ...jobInfo }; saveCustodyLedger(local); }
  const snapshot = local;
  if (snapshot.events.length && (!remote.ledger || JSON.stringify(snapshot.items) !== JSON.stringify(remote.ledger.items) || snapshot.events.length !== remote.ledger.events.length || snapshot.storeName !== remote.ledger.storeName || snapshot.address !== remote.ledger.address)) {
    const body = JSON.stringify({ expectedOwnerId: owner, ledger: snapshot });
    if (new TextEncoder().encode(body).length > 3 * 1024 * 1024) throw new Error('This job exceeds the 3 MB inventory sync limit. Device records are preserved.');
    const saved = await authFetchJson<{ ledger: CustodyLedger }>('/api/inventory/custody-ledger', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body,
    });
    if (saved.ledger.ownerId !== owner || saved.ledger.jobId !== jobId || saved.ledger.domain !== domain || !custodyPrefix(snapshot, saved.ledger) || saved.ledger.events.length !== snapshot.events.length || JSON.stringify(saved.ledger.items) !== JSON.stringify(snapshot.items)) throw new Error('Inventory save was not acknowledged. Retry sync.');
  }
  if (getStorageOwner() !== owner || getStorageOwnerEpoch() !== epoch) throw new Error('Account changed. Retry after signing in.');
  const acknowledged = new Map(snapshot.events.map(event => [event.id, event.hash]));
  saveSyncQueue(loadSyncQueue(domain).filter(event => acknowledged.get(event.id) !== event.hash), domain);
  const latest = loadCustodyLedger(jobId, domain);
  const result = { ...latest, events: latest.events.map(event => acknowledged.get(event.id) === event.hash ? { ...event, syncStatus: 'synced' as const } : event) };
  saveCustodyLedger(result);
  return result;
}

export async function flushCustodySyncQueue(skip?: { jobId: string; domain: InventoryDomain }): Promise<{ synced: number; remaining: number }> {
  const epoch = getStorageOwnerEpoch();
  const before = [...loadSyncQueue('merchandising'), ...loadSyncQueue('contract_parts')];
  const groups = new Map(before.map(event => [event.domain + ':' + event.jobId, event]));
  for (const event of groups.values()) {
    if (getStorageOwnerEpoch() !== epoch) break;
    if (event.jobId === skip?.jobId && event.domain === skip.domain) continue;
    try { await syncCustodyLedger(event.jobId, event.domain); } catch { /* Keep pending records. */ }
  }
  const remaining = loadSyncQueue('merchandising').length + loadSyncQueue('contract_parts').length;
  return { synced: Math.max(0, before.length - remaining), remaining };
}

export async function fileToCustodyEvidence(file: File, kind: CustodyEvidenceKind): Promise<CustodyEvidence> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose an inventory image smaller than 25 MB.');
  if (!file.type.startsWith('image/') && !['application/pdf','text/plain','text/csv'].includes(file.type)) throw new Error('Choose an image, PDF, text or CSV document for inventory evidence.');
  if (!file.type.startsWith('image/') && file.size > 1024 * 1024) throw new Error('Choose an inventory document smaller than 1 MB.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read evidence file'));
    reader.readAsDataURL(file);
  });
  let imageData = dataUrl;
  if (file.type.startsWith('image/')) {
    imageData = await new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Could not prepare inventory photo.'));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const prepared = canvas.toDataURL('image/jpeg', 0.72);
        if (prepared.length > 1024 * 1024) return reject(new Error('Inventory photo is too large. Choose a smaller photo.'));
        resolve(prepared);
      };
      image.onerror = () => reject(new Error('This photo format cannot be opened. Choose JPEG or PNG.'));
      image.src = dataUrl;
    });
  }
  return {
      id: randomId('custody-evidence'),
      kind,
      name: file.name || `${kind}-${Date.now()}`,
      mimeType: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
      dataUrl: imageData,
      capturedAt: new Date().toISOString(),
  };
}

export interface ProcedureInventoryRequirementContext {
  requirementId: string;
  procedureId: string;
  procedureVersion: string;
  procedureStepId: string;
  visitId?: string;
  requirementRole?: CustodyRequirementRole;
}

export async function recordInventoryForRequirement(input: {
  ledger: CustodyLedger;
  item?: CustodyItem;
  type: CustodyEventType;
  itemId?: string;
  partNumber: string;
  serialNumber: string;
  requirementContext: ProcedureInventoryRequirementContext;
  coordinates?: CustodyCoordinates;
  evidence?: CustodyEvidence[];
  receiptNumber?: string;
  trackingNumber?: string;
  notes?: string;
  packageId?: string;
  packageContents?: string;
  equipmentLabel?: string;
  sourceContext?: string;
}): Promise<CustodyLedger> {
  const itemId = input.item?.id ?? input.itemId ?? randomId('inventory-item');
  const event = await createCustodyEvent({
    jobId: input.ledger.jobId,
    itemId,
    type: input.type,
    domain: input.ledger.domain,
    partNumber: input.partNumber,
    serialNumber: input.serialNumber,
    coordinates: input.coordinates,
    evidenceIds: input.evidence?.map(entry => entry.id),
    receiptNumber: input.receiptNumber,
    trackingNumber: input.trackingNumber,
    notes: input.notes,
    packageId: input.packageId,
    packageContents: input.packageContents,
    equipmentLabel: input.equipmentLabel,
    sourceContext: input.sourceContext,
    previousHash: input.ledger.events.at(-1)?.hash,
    ...input.requirementContext,
  });
  const item: CustodyItem = input.item ?? {
    domain: input.ledger.domain,
    id: itemId,
    jobId: input.ledger.jobId,
    partNumber: input.partNumber.trim(),
    serialNumber: input.serialNumber.trim(),
    packageId: input.packageId?.trim() || undefined,
    packageContents: input.packageContents?.trim() || undefined,
    equipmentLabel: input.equipmentLabel?.trim() || undefined,
    sourceContext: input.sourceContext?.trim() || undefined,
    status: event.type === 'receive_in' ? 'received' : event.type === 'install' ? 'installed' : event.type === 'removal' ? 'removed' : 'returned',
    evidence: input.evidence ?? [],
    eventIds: [],
    updatedAt: event.occurredAt,
    ...input.requirementContext,
  };
  return appendCustodyEvent(input.ledger, event, { ...item, evidence: [...item.evidence, ...(input.evidence ?? [])] });
}

export { GENESIS_HASH };
