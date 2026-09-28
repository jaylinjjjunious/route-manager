import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Job } from '../../src/types';
import type { BlueAiRecord } from './blueAiPayload';

/** Single Express process; configure this directory on a persistent disk in production. */
export class BlueAiStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string) {}

  private async read(): Promise<Job[]> {
    try {
      const jobs = JSON.parse(await readFile(path.join(this.directory, 'jobs.json'), 'utf8'));
      if (!Array.isArray(jobs) || jobs.some(job => !job?.blueAi?.ownerId || !Number.isInteger(job.blueAi.revision))) {
        throw new Error('Invalid BlueAI store');
      }
      return jobs;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error; // Never overwrite unreadable data with an empty collection.
    }
  }

  async list(ownerId: string): Promise<Job[]> {
    await this.queue;
    return (await this.read()).filter(job => job.blueAi.ownerId === ownerId);
  }

  upsert(job: Job): Promise<{ action: 'created' | 'updated' | 'unchanged'; job: Job }> {
    const operation = this.queue.then(async () => {
      const jobs = await this.read();
      const old = jobs.find(item => item.id === job.id);
      // Unknown pay on a later read must not erase a previously captured amount.
      if (old?.blueAi.payKnown && !job.blueAi.payKnown) {
        job = { ...job, pay: old.pay, blueAi: { ...job.blueAi, payKnown: true } };
      }
      if (old && JSON.stringify({ ...old, blueAi: { ...old.blueAi, revision: 1 } }) === JSON.stringify(job)) {
        return { action: 'unchanged' as const, job: old };
      }
      if (!old && jobs.length >= 10000) throw new Error('BlueAI inbox capacity reached');
      const next = { ...job, blueAi: { ...job.blueAi, revision: (old?.blueAi.revision ?? 0) + 1 } };
      const updated = old ? jobs.map(item => item.id === job.id ? next : item) : [...jobs, next];
      await mkdir(this.directory, { recursive: true });
      const temporary = path.join(this.directory, `${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(updated), { mode: 0o600 });
        await rename(temporary, path.join(this.directory, 'jobs.json'));
      } finally {
        await unlink(temporary).catch(() => undefined);
      }
      return { action: old ? 'updated' as const : 'created' as const, job: next };
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}

export interface BlueAiStoredRecord {
  id: string;
  owner_id: string;
  source_app: string;
  external_id: string;
  category: 'assigned' | 'available';
  title: string;
  city: string | null;
  pay_raw: string | null;
  schedule_raw: string | null;
  status_raw: string | null;
  description_raw: string | null;
  source_payload: Record<string, unknown>;
  received_at: string;
  updated_at: string;
  revision: number;
}

export interface BlueAiStoreInterface {
  replaceSnapshot(records: BlueAiRecord[]): Promise<{ upserted: number; deleted: number }>;
  list(ownerId: string, category?: 'assigned' | 'available'): Promise<BlueAiStoredRecord[]>;
}

export class BlueAiSupabaseStore implements BlueAiStoreInterface {
  private admin: SupabaseClient;
  private ownerId: string;

  constructor(admin: SupabaseClient, ownerId: string) {
    this.admin = admin;
    this.ownerId = ownerId;
  }

  async replaceSnapshot(records: BlueAiRecord[]): Promise<{ upserted: number; deleted: number }> {
    if (records.length === 0) return { upserted: 0, deleted: 0 };

    const externalIds = records.map(r => r.externalId);
    const { data, error } = await this.admin.rpc('blueai_replace_snapshot', {
      p_owner_id: this.ownerId,
      p_source_app: 'barrister',
      p_records: records.map(r => ({
        external_id: r.externalId,
        category: r.category,
        title: r.title,
        city: r.city,
        pay_raw: r.payRaw,
        schedule_raw: r.scheduleRaw,
        status_raw: r.statusRaw,
        description_raw: r.descriptionRaw,
        source_payload: r.sourcePayload,
      })),
    });

    if (error) throw error;
    return { upserted: data.upserted, deleted: data.deleted };
  }

  async list(ownerId: string, category?: 'assigned' | 'available'): Promise<BlueAiStoredRecord[]> {
    let query = this.admin
      .from('blueai_records')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('source_app', 'barrister')
      .order('updated_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as BlueAiStoredRecord[];
  }

  async listAvailable(ownerId: string): Promise<BlueAiStoredRecord[]> {
    return this.list(ownerId, 'available');
  }
}

export class InMemoryBlueAiStore implements BlueAiStoreInterface {
  private records: BlueAiStoredRecord[] = [];
  private ownerId: string;
  private revisionCounter = 0;

  constructor(ownerId: string) {
    this.ownerId = ownerId;
  }

  async replaceSnapshot(records: BlueAiRecord[]): Promise<{ upserted: number; deleted: number }> {
    if (records.length === 0) {
      const deleted = this.records.length;
      this.records = [];
      return { upserted: 0, deleted };
    }

    const externalIds = new Set(records.map(r => r.externalId));
    const now = new Date().toISOString();

    // Upsert/replace records
    for (const record of records) {
      const existingIdx = this.records.findIndex(
        r => r.owner_id === this.ownerId && r.source_app === 'barrister' && r.external_id === record.externalId
      );
      this.revisionCounter++;
      const row: BlueAiStoredRecord = {
        id: existingIdx >= 0 ? this.records[existingIdx].id : randomUUID(),
        owner_id: this.ownerId,
        source_app: 'barrister',
        external_id: record.externalId,
        category: record.category,
        title: record.title,
        city: record.city,
        pay_raw: record.payRaw,
        schedule_raw: record.scheduleRaw,
        status_raw: record.statusRaw,
        description_raw: record.descriptionRaw,
        source_payload: record.sourcePayload,
        received_at: existingIdx >= 0 ? this.records[existingIdx].received_at : now,
        updated_at: now,
        revision: (existingIdx >= 0 ? this.records[existingIdx].revision : 0) + 1,
      };
      if (existingIdx >= 0) {
        this.records[existingIdx] = row;
      } else {
        this.records.push(row);
      }
    }

    // Delete records not in current snapshot (reconciliation)
    const originalLength = this.records.length;
    this.records = this.records.filter(r => r.owner_id !== this.ownerId || r.source_app !== 'barrister' || externalIds.has(r.external_id));
    const deleted = originalLength - this.records.length;

    return { upserted: records.length, deleted };
  }

  async list(ownerId: string, category?: 'assigned' | 'available'): Promise<BlueAiStoredRecord[]> {
    return this.records
      .filter(r => r.owner_id === ownerId && r.source_app === 'barrister' && (!category || r.category === category))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async listAvailable(ownerId: string): Promise<BlueAiStoredRecord[]> {
    return this.list(ownerId, 'available');
  }

  // For testing: clear all records
  clear(): void {
    this.records = [];
  }
}

export class BlueAiFileStore implements BlueAiStoreInterface {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string, private ownerId: string) {}

  private async read(): Promise<BlueAiStoredRecord[]> {
    try {
      const records = JSON.parse(await readFile(path.join(this.directory, 'blueai_records.json'), 'utf8'));
      if (!Array.isArray(records)) throw new Error('Invalid BlueAI records store');
      return records;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async replaceSnapshot(records: BlueAiRecord[]): Promise<{ upserted: number; deleted: number }> {
    if (records.length === 0) return { upserted: 0, deleted: 0 };
    const now = new Date().toISOString();
    const externalIds = records.map(r => r.externalId);

    const operation = this.queue.then(async () => {
      const existing = await this.read();
      const existingMap = new Map(existing.map(r => [`${r.owner_id}:${r.source_app}:${r.external_id}`, r]));
      const rows = records.map(r => ({
        id: randomUUID(),
        owner_id: this.ownerId,
        source_app: r.sourceApp,
        external_id: r.externalId,
        category: r.category,
        title: r.title,
        city: r.city,
        pay_raw: r.payRaw,
        schedule_raw: r.scheduleRaw,
        status_raw: r.statusRaw,
        description_raw: r.descriptionRaw,
        source_payload: r.sourcePayload,
        received_at: now,
        updated_at: now,
        revision: (existingMap.get(`${this.ownerId}:${r.sourceApp}:${r.externalId}`)?.revision ?? 0) + 1,
      }));

      for (const row of rows) {
        const key = `${row.owner_id}:${row.source_app}:${row.external_id}`;
        const idx = existing.findIndex(r => `${r.owner_id}:${r.source_app}:${r.external_id}` === key);
        if (idx >= 0) existing[idx] = row;
        else existing.push(row);
      }

      // Delete records not in current snapshot
      const filtered = existing.filter(r => externalIds.includes(r.external_id));

      await mkdir(this.directory, { recursive: true });
      const temporary = path.join(this.directory, `${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(filtered), { mode: 0o600 });
        await rename(temporary, path.join(this.directory, 'blueai_records.json'));
      } finally {
        await unlink(temporary).catch(() => undefined);
      }

      return { upserted: records.length, deleted: existing.length - filtered.length };
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  async list(ownerId: string, category?: 'assigned' | 'available'): Promise<BlueAiStoredRecord[]> {
    await this.queue;
    const records = await this.read();
    return records
      .filter(r => r.owner_id === ownerId && r.source_app === 'barrister' && (!category || r.category === category))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async listAvailable(ownerId: string): Promise<BlueAiStoredRecord[]> {
    return this.list(ownerId, 'available');
  }
}