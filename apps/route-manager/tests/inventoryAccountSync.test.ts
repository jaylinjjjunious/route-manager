import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { setStorageOwner } from '../src/utils/ownerStorage';
import { appendCustodyEvent, createCustodyEvent, emptyCustodyLedger, importLegacyCustodyLedger,
  loadCustodyLedger, loadSyncQueue, syncCustodyLedger, type CustodyLedger, type CustodyItem } from '../src/services/inventory/chainOfCustody';
import { validateInventoryLedger } from '../server/inventory/inventoryRoutes';
import { mergeInventoryJobs } from '../src/services/inventory/useInventoryAccountJobs';
const api = vi.hoisted(() => vi.fn());
vi.mock('../src/services/apiClient', () => ({ authFetchJson: api }));
beforeEach(() => { localStorage.clear(); setStorageOwner('owner-a'); api.mockReset(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); setStorageOwner(null); });
async function receive(jobId = 'job-1', previous = emptyCustodyLedger(jobId)): Promise<CustodyLedger> {
  const id = `item-${previous.events.length}`;
  const item: CustodyItem = { id, jobId, domain: 'merchandising', partNumber: '', serialNumber: '', packageId: id,
    status: 'received', eventIds: [], evidence: [], updatedAt: new Date().toISOString() };
  const event = await createCustodyEvent({ jobId, itemId: id, domain: 'merchandising', type: 'receive_in', partNumber: '', serialNumber: '', packageId: id, previousHash: previous.events.at(-1)?.hash });
  return appendCustodyEvent(previous, event, item);
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

it('isolates accounts and ignores a stale ledger after A→B→A', async () => {
  const old = await receive(); setStorageOwner('owner-b');
  expect(loadCustodyLedger('job-1').events).toHaveLength(0);
  expect(loadSyncQueue()).toHaveLength(0); setStorageOwner('owner-a');
  const current = await receive('job-1', loadCustodyLedger('job-1'));
  appendCustodyEvent(old, old.events[0], old.items[0]);
  expect(loadCustodyLedger('job-1').events).toHaveLength(current.events.length);
});
it('preserves unowned history and only copies it after explicit import', async () => {
  const legacy = await receive(); localStorage.clear();
  const key = 'inventory_custody_ledger_v2:merchandising:job-1'; localStorage.setItem(key, JSON.stringify(legacy));
  expect(loadCustodyLedger('job-1').events).toHaveLength(0);
  await importLegacyCustodyLedger('job-1', 'merchandising');
  expect(loadCustodyLedger('job-1').events).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(legacy);
});
it('sends the complete ledger and clears only acknowledged queue events', async () => {
  const first = await receive(); const pending = deferred<{ ledger: CustodyLedger }>();
  api.mockResolvedValueOnce({ ledger: null }).mockReturnValueOnce(pending.promise);
  const syncing = syncCustodyLedger('job-1', 'merchandising');
  await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  const sent = JSON.parse(api.mock.calls[1][1].body);
  expect(sent.expectedOwnerId).toBe('owner-a'); expect(sent.ledger.items).toEqual(first.items);
  await receive('job-1', loadCustodyLedger('job-1'));
  pending.resolve({ ledger: first }); await syncing;
  expect(loadCustodyLedger('job-1').events).toHaveLength(2);
  expect(loadSyncQueue()).toHaveLength(1);
});
it('restores the account ledger on a new device without losing proof data', async () => {
  const remote = await receive(); localStorage.clear(); api.mockResolvedValueOnce({ ledger: remote });
  const restored = await syncCustodyLedger('job-1', 'merchandising');
  expect(restored.items).toEqual(remote.items); expect(restored.events[0].syncStatus).toBe('synced');
  expect(api).toHaveBeenCalledTimes(1);
});
it('does not acknowledge an old response after A→B→A', async () => {
  await receive(); const pending = deferred<{ ledger: null }>(); api.mockReturnValueOnce(pending.promise);
  const syncing = syncCustodyLedger('job-1','merchandising');
  await vi.waitFor(() => expect(api).toHaveBeenCalledOnce()); setStorageOwner('owner-b'); setStorageOwner('owner-a');
  pending.resolve({ ledger: null }); await expect(syncing).rejects.toThrow('Account changed');
  expect(loadSyncQueue()).toHaveLength(1); expect(api).toHaveBeenCalledOnce();
});
it('preserves a pending queue when the server response acknowledges the wrong job', async () => {
  await receive(); api.mockResolvedValueOnce({ ledger: null }).mockResolvedValueOnce({ ledger: emptyCustodyLedger('wrong') });
  await expect(syncCustodyLedger('job-1','merchandising')).rejects.toThrow('not acknowledged'); expect(loadSyncQueue()).toHaveLength(1);
});
it('preserves both sides of a divergent history', async () => {
  const local = await receive();
  const otherEvent = await createCustodyEvent({ jobId:'job-1',itemId:local.items[0].id,type:'receive_in',partNumber:'',serialNumber:'',packageId:'different' });
  api.mockResolvedValueOnce({ ledger: { ...local, events: [otherEvent] } });
  await expect(syncCustodyLedger('job-1','merchandising')).rejects.toThrow('conflict');
  expect(loadCustodyLedger('job-1').events[0].hash).toBe(local.events[0].hash); expect(loadSyncQueue()).toHaveLength(1);
});
it('rejects owner overrides, tampered history and oversized event collections', async () => {
  const ledger = await receive(); await expect(validateInventoryLedger(ledger, 'owner-a')).resolves.toHaveProperty('ownerId','owner-a');
  await expect(validateInventoryLedger(ledger,'owner-b')).rejects.toThrow();
  await expect(validateInventoryLedger({ ...ledger, events: [{ ...ledger.events[0], packageId:'tampered' }] },'owner-a')).rejects.toThrow('review');
  await expect(validateInventoryLedger({ ...ledger, events: Array(201).fill(ledger.events[0]) },'owner-a')).rejects.toThrow();
});

it('coalesces overlapping sync calls for the same account and job', async () => {
  await receive(); const pending = deferred<{ ledger: null }>(); api.mockReturnValueOnce(pending.promise);
  const first = syncCustodyLedger('job-1','merchandising'); const second = syncCustodyLedger('job-1','merchandising');
  expect(second).toBe(first); pending.resolve({ ledger: null });
  api.mockImplementationOnce(async (_path, options) => ({ ledger: JSON.parse(options.body).ledger }));
  await Promise.all([first,second]); expect(api).toHaveBeenCalledTimes(2);
});

it('reports storage exhaustion instead of claiming an offline save', async () => {
  const ledger = await receive();
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new DOMException('Full','QuotaExceededError'); });
  expect(() => appendCustodyEvent(ledger,ledger.events[0],ledger.items[0])).toThrow('Device storage');
});

it('keeps local job context while making cloud-only inventory jobs selectable', () => {
  const local = {id:'local',storeName:'Current job',address:'Current address',inventoryDomain:'merchandising' as const};
  const cloud = {id:'cloud-only',storeName:'Saved job',address:'Saved address',inventoryDomain:'merchandising' as const};
  expect(mergeInventoryJobs([local],[{...local,storeName:'Old name'},cloud])).toEqual([local,cloud]);
});

it('retains inventory and its queue while offline', async () => {
  await receive(); vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
  await expect(syncCustodyLedger('job-1','merchandising')).rejects.toThrow('Offline');
  expect(loadSyncQueue()).toHaveLength(1); expect(api).not.toHaveBeenCalled();
});

it('serializes different jobs and refuses a queued task after an account change', async () => {
  await receive('job-1'); await receive('job-2');
  const pending = deferred<{ ledger: CustodyLedger | null }>(); api.mockReturnValueOnce(pending.promise);
  const first = syncCustodyLedger('job-1','merchandising');
  const second = syncCustodyLedger('job-2','merchandising');
  await vi.waitFor(() => expect(api).toHaveBeenCalledOnce());
  setStorageOwner('owner-b'); pending.resolve({ ledger:null });
  await expect(first).rejects.toThrow('Account changed'); await expect(second).rejects.toThrow('Account changed');
  expect(api).toHaveBeenCalledOnce(); setStorageOwner('owner-a'); expect(loadSyncQueue()).toHaveLength(2);
});
