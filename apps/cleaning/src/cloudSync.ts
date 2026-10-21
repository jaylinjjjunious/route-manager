import { emptyPlan, parsePlan, type Plan } from './model';
import { STORAGE_KEY } from './storage';

export type Snapshot = { plan: Plan; revision: number; updated_at: string };
export type CloudApi = { load: () => Promise<Snapshot | null>; save: (plan: Plan, revision: number) => Promise<Snapshot> };
export const accountKey = (owner: string) => `${STORAGE_KEY}.account.${owner}`;
const canonical = (plan: Plan) => JSON.stringify(parsePlan(JSON.stringify(plan)));
type Meta = { revision: number; baseRaw: string | null };
export class CleaningSync {
  readonly key: string;
  conflict: Snapshot | null = null;
  message = 'Connecting to your cloud plan…';
  private disposed = false;
  private busy = false;
  private queued = false;
  constructor(owner: string, private storage: Storage, private api: CloudApi, private changed: (applied: boolean) => void) { this.key = accountKey(owner); }
  dispose() { this.disposed = true; }
  private meta(): Meta {
    const raw = this.storage.getItem(`${this.key}.sync`);
    if (!raw) return { revision: 0, baseRaw: null };
    const data = JSON.parse(raw) as Meta;
    if (!Number.isSafeInteger(data.revision) || data.revision < 0 || !(data.baseRaw === null || typeof data.baseRaw === 'string')) throw new Error('Cloud sync metadata could not be read. Export your device plan before recovering.');
    return data;
  }
  private acknowledge(snapshot: Snapshot) { if (this.meta().revision > snapshot.revision) return; this.storage.setItem(`${this.key}.sync`, JSON.stringify({ revision: snapshot.revision, baseRaw: canonical(snapshot.plan) })); }
  private preserve(raw: string | null) { if (raw) this.storage.setItem(`${this.key}.recovery.${crypto.randomUUID()}`, raw); }
  async sync() {
    if (this.disposed) return;
    if (this.busy) { this.queued = true; return; }
    this.busy = true;
    try {
      this.message = 'Syncing…'; this.changed(false);
      const remote = await this.api.load();
      if (this.disposed) return;
      const raw = this.storage.getItem(this.key);
      const local = raw === null ? null : canonical(parsePlan(raw));
      const meta = this.meta();
      if (remote && remote.revision < meta.revision) { this.message = 'A newer sync already completed on this browser. Checking again shortly.'; return; }
      if (remote && local === canonical(remote.plan)) {
        this.acknowledge(remote); this.conflict = null; this.message = 'All changes synced';
      } else if (remote && (local === null || local === meta.baseRaw)) {
        this.storage.setItem(this.key, canonical(remote.plan)); this.acknowledge(remote);
        this.conflict = null; this.message = 'All changes synced'; this.changed(true);
      } else if (remote && remote.revision !== meta.revision) {
        this.conflict = remote; this.message = 'Both this device and the cloud have changes. Choose which plan to use; neither has been overwritten.';
      } else if (local !== null && local !== meta.baseRaw) {
        const saved = await this.api.save(parsePlan(local), remote?.revision ?? 0);
        if (this.disposed) return;
        this.acknowledge(saved); this.conflict = null; this.message = 'All changes synced';
        if (this.storage.getItem(this.key) !== raw) this.queued = true;
      } else { this.conflict = null; this.message = remote ? 'All changes synced' : 'Cloud connected. Your next change will be saved to your account.'; }
    } catch (error) {
      if (!this.disposed) this.message = `Saved on this device; cloud sync needs attention. ${error instanceof Error ? error.message : 'Try again when online.'}`;
    } finally {
      this.busy = false;
      if (!this.disposed) { this.changed(false); if (this.queued) { this.queued = false; void this.sync(); } }
    }
  }
  async resolve(choice: 'cloud' | 'device') {
    if (this.busy || !this.conflict || this.disposed) return;
    this.busy = true;
    try {
      const remote = this.conflict;
      const raw = this.storage.getItem(this.key);
      this.preserve(raw); this.preserve(canonical(remote.plan));
      if (choice === 'cloud') {
        this.storage.setItem(this.key, canonical(remote.plan)); this.acknowledge(remote);
        this.conflict = null; this.message = 'Cloud plan loaded. Previous plans are kept in device recovery.'; this.changed(true);
      } else {
        const saved = await this.api.save(raw ? parsePlan(raw) : emptyPlan(), remote.revision);
        if (this.disposed) return;
        this.acknowledge(saved); this.conflict = null; this.message = 'Device plan synced. Previous plans are kept in device recovery.';
        if (this.storage.getItem(this.key) !== raw) this.queued = true;
      }
    } catch (error) { if (!this.disposed) this.message = error instanceof Error ? error.message : 'Could not resolve these changes. Retry sync.'; }
    finally { this.busy = false; if (!this.disposed) { this.changed(false); if (this.queued) { this.queued = false; void this.sync(); } } }
  }
}
