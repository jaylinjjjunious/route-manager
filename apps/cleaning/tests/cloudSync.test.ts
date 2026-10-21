// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { CleaningSync, accountKey, type CloudApi, type Snapshot } from '../src/cloudSync';
import { emptyPlan, type Plan } from '../src/model';
import { savePlan, STORAGE_KEY } from '../src/storage';
const plan = (name: string): Plan => ({...emptyPlan(),spaces:[{id:'room',name,archived:false}]});
const snap = (name: string, revision: number): Snapshot => ({plan:plan(name),revision,updated_at:'2026-10-21T12:00:00Z'});
const raw = (name:string) => JSON.stringify(plan(name));
beforeEach(()=>localStorage.clear());
function setup(remote: Snapshot | null = null) {
  let value=remote;
  const api:CloudApi={load:vi.fn(async()=>value),save:vi.fn(async(p,r)=>{if(r!==(value?.revision??0))throw new Error('Conflict');value={plan:p,revision:r+1,updated_at:'2026-10-21T12:00:00Z'};return value;})};
  const changed=vi.fn();const engine=new CleaningSync('owner',localStorage,api,changed);
  return {engine,api,changed,remote:()=>value,setRemote:(v:Snapshot)=>{value=v;}};
}
it('keeps legacy data separate and writes account storage with stale-write protection',()=>{
  localStorage.setItem(STORAGE_KEY,raw('Legacy'));
  expect(()=>savePlan(localStorage,plan('Account'),null,accountKey('owner'))).not.toThrow();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw('Legacy'));
  expect(()=>savePlan(localStorage,plan('Other'),null,accountKey('owner'))).toThrow('changed');
});
it('loads cloud on a fresh device and uploads subsequent local edits',async()=>{
  const s=setup(snap('Cloud',3));await s.engine.sync();expect(localStorage.getItem(accountKey('owner'))).toBe(raw('Cloud'));expect(s.changed).toHaveBeenCalledWith(true);
  localStorage.setItem(accountKey('owner'),raw('Changed'));await s.engine.sync();expect(s.remote()!.plan.spaces[0].name).toBe('Changed');expect(s.remote()!.revision).toBe(4);
});
it('keeps offline changes and retries without losing them',async()=>{
  const s=setup();localStorage.setItem(accountKey('owner'),raw('Offline'));vi.mocked(s.api.load).mockRejectedValueOnce(new Error('Offline'));await s.engine.sync();expect(s.engine.message).toContain('Saved on this device');expect(localStorage.getItem(accountKey('owner'))).toBe(raw('Offline'));
  await s.engine.sync();expect(s.remote()!.plan.spaces[0].name).toBe('Offline');
});
it('detects concurrent changes and preserves both before explicit resolution',async()=>{
  const s=setup(snap('Base',1));await s.engine.sync();localStorage.setItem(accountKey('owner'),raw('Local'));s.setRemote(snap('Other device',2));await s.engine.sync();expect(s.engine.conflict?.revision).toBe(2);expect(s.api.save).not.toHaveBeenCalled();
  await s.engine.resolve('device');expect(s.remote()!.plan.spaces[0].name).toBe('Local');expect(Object.keys(localStorage).filter(k=>k.includes('.recovery.'))).toHaveLength(2);
});
it('can use the cloud conflict without deleting the local recovery',async()=>{
  const s=setup(snap('Base',1));await s.engine.sync();localStorage.setItem(accountKey('owner'),raw('Local'));s.setRemote(snap('Remote',2));await s.engine.sync();await s.engine.resolve('cloud');expect(localStorage.getItem(accountKey('owner'))).toBe(raw('Remote'));expect(Object.values(localStorage)).toContain(raw('Local'));
});
it('does not apply an old-account response after disposal',async()=>{
  let resolve!:(v:Snapshot)=>void;const s=setup();vi.mocked(s.api.load).mockImplementation(()=>new Promise(r=>{resolve=r;}));const pending=s.engine.sync();s.engine.dispose();resolve(snap('Private',1));await pending;expect(localStorage.getItem(accountKey('owner'))).toBeNull();
});
it('never mixes two owner caches',async()=>{
  localStorage.setItem(accountKey('other'),raw('Other private plan'));const s=setup(snap('Mine',1));await s.engine.sync();expect(localStorage.getItem(accountKey('other'))).toBe(raw('Other private plan'));
});
it('recognizes a cloud save that succeeded before its acknowledgement was lost',async()=>{
  const s=setup(snap('Same',2));localStorage.setItem(accountKey('owner'),raw('Same'));await s.engine.sync();expect(s.api.save).not.toHaveBeenCalled();expect(s.engine.message).toBe('All changes synced');
});
it('uploads an edit made while an earlier save is in flight',async()=>{
  const s=setup();localStorage.setItem(accountKey('owner'),raw('First'));let finish!:(v:Snapshot)=>void;vi.mocked(s.api.save).mockImplementationOnce(()=>new Promise(r=>{finish=r;}));const pending=s.engine.sync();await Promise.resolve();localStorage.setItem(accountKey('owner'),raw('Second'));s.setRemote(snap('First',1));finish(snap('First',1));await pending;await vi.waitFor(()=>expect(s.remote()!.plan.spaces[0].name).toBe('Second'));
});

it('ignores an old cloud read after another tab has already synced a newer revision',async()=>{
  const s=setup(snap('New',2));await s.engine.sync();s.setRemote(snap('Old',1));await s.engine.sync();expect(localStorage.getItem(accountKey('owner'))).toBe(raw('New'));expect(s.api.save).not.toHaveBeenCalled();
});
