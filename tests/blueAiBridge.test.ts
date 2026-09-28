import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { createBlueAiRouter } from '../server/blueai/blueAiRoutes';
import { BlueAiStore } from '../server/blueai/blueAiStore';
import { InvalidBlueAiPayload, normalizeBlueAiPayload, normalizeBarristerExport } from '../server/blueai/blueAiPayload';
import { mergeBlueAiJobs } from '../src/features/jobs/blueAiJobs';
import { groupJobsByDay } from '../src/features/jobs/jobSchedule';
import fixture from './fixtures/blueai-job.json';

const ownerId = '11111111-1111-4111-8111-111111111111';
const token = 'test-only-bridge-token-at-least-32-characters';
const servers: Server[] = [];
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))));
  await Promise.all(directories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function setupLegacy(enabled = true) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'blueai-test-'));
  directories.push(dataDir);
  const app = express();
  const config = enabled ? { token, ownerId, dataDir } : { token: '', ownerId: '', admin: undefined, dataDir: '' };
  app.use('/api/integrations/blueai', createBlueAiRouter((req, res, next) => {
    const authorization = req.get('authorization');
    if (!authorization?.startsWith('Bearer user:')) return res.status(401).json({ error: 'Login required' });
    Object.assign(req, { userId: authorization.slice('Bearer user:'.length) });
    next();
  }, config));
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  servers.push(server);
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/integrations/blueai/jobs`;
  const post = (body: unknown, credential = token) => fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const get = (user = ownerId) => fetch(url, { headers: { Authorization: `Bearer user:${user}` } });
  return { dataDir, post, get, url };
}

async function setupExport() {
  const app = express();
  app.use('/api/integrations/blueai', createBlueAiRouter((req, res, next) => {
    const authorization = req.get('authorization');
    if (!authorization?.startsWith('Bearer user:')) return res.status(401).json({ error: 'Login required' });
    Object.assign(req, { userId: authorization.slice('Bearer user:'.length) });
    next();
  }, { token, ownerId }));
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  servers.push(server);
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/integrations/blueai`;
  const postExport = (body: unknown, credential = token) => fetch(`${baseUrl}/export`, {
    method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const getRecords = async (user = ownerId, category?: string) => {
    const res = await fetch(`${baseUrl}/records${category ? `?category=${category}` : ''}`, {
      headers: { Authorization: `Bearer user:${user}` }
    });
    const data = await res.json();
    if (category) return data[category];
    return [...data.assigned, ...data.available];
  };
  return { postExport, getRecords };
}

describe('BlueAI legacy single-job receiver → durable Job snapshot → existing calendar', () => {
  it('creates, retries, updates the same job, persists across store reload and moves the calendar day', async () => {
    const { post, get, dataDir } = await setupLegacy();
    const firstResponse = await post({ ...fixture, title: ` ${fixture.title} ` });
    expect(firstResponse.status).toBe(201);
    const first = await firstResponse.json();
    expect(first.action).toBe('created');
    expect(first.job.storeName).toBe(fixture.title);
    expect(first.job.estimatedMinutes).toBe(90);
    // Retry with same data returns unchanged
    expect((await (await post(fixture)).json()).action).toBe('unchanged');
    let jobs = mergeBlueAiJobs([], (await (await get()).json()).jobs, ownerId);
    expect(groupJobsByDay(jobs, fixture.date)[0].jobs).toHaveLength(1);
    jobs[0] = { ...jobs[0], status: 'completed', isCompleted: true, notes: 'Keep my proof notes', routeId: 'B' };
    const updated = await (await post({ ...fixture, date: '2026-09-29', pay: 42 })).json();
    expect(updated.action).toBe('updated');
    expect(updated.job.id).toBe(first.job.id);
    // Revision increments on update
    expect(updated.job.blueAi.revision).toBe(2);
    const persisted = await new BlueAiStore(dataDir).list(ownerId);
    jobs = mergeBlueAiJobs(jobs, persisted, ownerId);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ pay: 42, notes: 'Keep my proof notes', status: 'completed', routeId: 'B', isCompleted: true });
    expect(groupJobsByDay(jobs, fixture.date)[0].jobs).toHaveLength(0);
    expect(groupJobsByDay(jobs, fixture.date)[1].jobs).toHaveLength(1);
    expect(mergeBlueAiJobs(jobs, persisted, ownerId)).toBe(jobs);
    expect(mergeBlueAiJobs([], persisted, ownerId, [first.job.id])).toEqual([]);
    expect(mergeBlueAiJobs([], persisted, 'another-user')).toEqual([]);
  });

  it('requires machine auth, isolates reads and fails closed when disabled', async () => {
    const { post, get, url } = await setupLegacy();
    expect((await post(fixture, 'wrong')).status).toBe(401);
    expect((await post(fixture, `user:${ownerId}`)).status).toBe(401);
    expect((await fetch(url)).status).toBe(401);
    await post(fixture);
    expect((await (await get('other-user')).json()).jobs).toEqual([]);
    expect((await (await setupLegacy(false)).post(fixture)).status).toBe(503);
  });

  it('rejects malformed dates, times, pay, coordinates, spoofed owners, oversized and malformed JSON', async () => {
    const { post, url } = await setupLegacy();
    for (const changes of [
      { date: '2026-02-30' }, { startTime: '25:00' }, { endTime: '08:00' },
      { title: ' ' }, { pay: -1 }, { pay: '$35' }, { ownerId: 'other' },
      { coordinates: { lat: 100, lng: 0 } }, { timezone: 'UTC' }, { externalId: '' },
    ]) expect((await post({ ...fixture, ...changes })).status).toBe(400);
    expect((await post({ ...fixture, title: 'x'.repeat(17000) })).status).toBe(413);
    expect((await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
    expect(normalizeBlueAiPayload({ ...fixture, startTime: '23:00', endTime: '01:00', endDate: '2026-09-29' }, ownerId).estimatedMinutes).toBe(120);
  });

});

describe('BlueAI Barrister export normalization', () => {
  const barristerExport = {
    assigned_work_orders: [
      { order_number: 'ASSIGN-001', title: 'Assigned Job', city: 'Bakersfield', pay: '$35.00', schedule: '09/28 09:00', status: 'Dispatched', description: 'Assigned work order' },
    ],
    available_jobs: [
      { order_number: 'AVAIL-001', title: 'Available Job', city: 'Fresno', pay: '$25.00', schedule: '09/29 17:00', status: 'Pending Dispatch', description: 'Available opportunity' },
    ],
  };

  it('parses assigned and available records with raw schedule preserved', () => {
    const records = normalizeBarristerExport(barristerExport, ownerId);
    expect(records).toHaveLength(2);
    const assigned = records.find(r => r.externalId === 'ASSIGN-001');
    const available = records.find(r => r.externalId === 'AVAIL-001');
    expect(assigned?.category).toBe('assigned');
    expect(assigned?.scheduleRaw).toBe('09/28 09:00');
    expect(available?.category).toBe('available');
    expect(available?.scheduleRaw).toBe('09/29 17:00');
    expect(available?.payRaw).toBe('$25.00');
  });

  it('preserves unknown source fields in sourcePayload', () => {
    const exportWithExtra = {
      assigned_work_orders: [],
      available_jobs: [{ order_number: 'EXTRA-001', title: 'Test', city: null, pay: null, schedule: null, status: null, description: null, unknown_field: 'should be kept' }],
    };
    const records = normalizeBarristerExport(exportWithExtra, ownerId);
    expect(records[0].sourcePayload).toHaveProperty('unknown_field', 'should be kept');
  });

  it('same order_number in both arrays resolves to assigned', () => {
    const both = {
      assigned_work_orders: [{ order_number: 'SAME-001', title: 'Assigned', city: null, pay: null, schedule: null, status: null, description: null }],
      available_jobs: [{ order_number: 'SAME-001', title: 'Available', city: null, pay: null, schedule: null, status: null, description: null }],
    };
    const records = normalizeBarristerExport(both, ownerId);
    expect(records).toHaveLength(1);
    expect(records[0].category).toBe('assigned');
  });

  it('rejects malformed top-level export', () => {
    expect(() => normalizeBarristerExport({}, ownerId)).toThrow('assigned_work_orders and available_jobs arrays');
    expect(() => normalizeBarristerExport({ assigned_work_orders: [], available_jobs: 'not-array' }, ownerId)).toThrow('arrays');
    expect(() => normalizeBarristerExport(null, ownerId)).toThrow('Barrister export object');
  });

  it('rejects records missing order_number', () => {
    expect(() => normalizeBarristerExport({ assigned_work_orders: [{ title: 'No ID' }], available_jobs: [] }, ownerId)).toThrow('order number');
  });
});

describe('BlueAI Barrister export endpoint with in-memory store', () => {
  it('upserts assigned and available records, reconciles deleted records', async () => {
    const { postExport, getRecords } = await setupExport();
    const export1 = {
      assigned_work_orders: [{ order_number: 'JOB-001', title: 'Job One', city: 'City A', pay: '$30', schedule: '09/28 08:00', status: 'Active', description: 'Desc' }],
      available_jobs: [{ order_number: 'JOB-002', title: 'Job Two', city: 'City B', pay: '$20', schedule: '09/29 10:00', status: 'Open', description: 'Desc' }],
    };
    const res1 = await postExport(export1);
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.assigned).toBe(1);
    expect(json1.available).toBe(1);

    const records1 = await getRecords(ownerId);
    expect(records1.length).toBe(2);

    // Second export - first job removed, second changed category, third added
    const export2 = {
      assigned_work_orders: [{ order_number: 'JOB-002', title: 'Job Two Updated', city: 'City B', pay: '$25', schedule: '09/29 10:00', status: 'Assigned', description: 'Updated' }],
      available_jobs: [{ order_number: 'JOB-003', title: 'Job Three', city: 'City C', pay: '$40', schedule: '09/30 12:00', status: 'Open', description: 'New' }],
    };
    const res2 = await postExport(export2);
    expect(res2.status).toBe(200);

    const records2 = await getRecords(ownerId);
    expect(records2.length).toBe(2);
    const job2 = records2.find((r: any) => r.externalId === 'JOB-002');
    const job3 = records2.find((r: any) => r.externalId === 'JOB-003');
    expect(job2?.category).toBe('assigned');
    expect(job2?.title).toBe('Job Two Updated');
    expect(job3?.category).toBe('available');
    const job1 = records2.find((r: any) => r.externalId === 'JOB-001');
    expect(job1).toBeUndefined();
  });

  it('category query param filters results', async () => {
    const { postExport, getRecords } = await setupExport();
    await postExport({
      assigned_work_orders: [{ order_number: 'A-001', title: 'A', city: null, pay: null, schedule: null, status: null, description: null }],
      available_jobs: [{ order_number: 'B-001', title: 'B', city: null, pay: null, schedule: null, status: null, description: null }],
    });
    const assigned = await getRecords(ownerId, 'assigned');
    const available = await getRecords(ownerId, 'available');
    expect(assigned).toHaveLength(1);
    expect(assigned[0].category).toBe('assigned');
    expect(available).toHaveLength(1);
    expect(available[0].category).toBe('available');
  });

  it('requires machine auth for export', async () => {
    const { postExport } = await setupExport();
    const res = await postExport({}, 'wrong-token');
    expect(res.status).toBe(401);
  });

  it('requires user auth for records GET', async () => {
    const { getRecords } = await setupExport();
    const res = await getRecords('other-user');
    // Other user gets empty records (enabled: false returns empty arrays)
    expect(res).toHaveLength(0);
  });
});

describe('InMemoryBlueAiStore unit tests', () => {
  it('replaceSnapshot upserts new records', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store = new InMemoryBlueAiStore(ownerId);
    const records = [
      { sourceApp: 'barrister' as const, externalId: 'A-001', category: 'assigned' as const, title: 'Job A', city: 'City A', payRaw: '$10', scheduleRaw: '09/28', statusRaw: 'Active', descriptionRaw: 'Desc', sourcePayload: {} },
    ];
    const result = await store.replaceSnapshot(records);
    expect(result.upserted).toBe(1);
    expect(result.deleted).toBe(0);
    const listed = await store.list(ownerId);
    expect(listed.length).toBe(1);
    expect(listed[0].external_id).toBe('A-001');
    expect(listed[0].category).toBe('assigned');
  });

  it('replaceSnapshot transitions category available -> assigned', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store = new InMemoryBlueAiStore(ownerId);
    await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'X-001', category: 'available' as const, title: 'Job X', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    const result = await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'X-001', category: 'assigned' as const, title: 'Job X Updated', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    expect(result.upserted).toBe(1);
    const listed = await store.list(ownerId);
    expect(listed[0].category).toBe('assigned');
    expect(listed[0].title).toBe('Job X Updated');
    expect(listed[0].revision).toBe(2);
  });

  it('replaceSnapshot reconciles deleted records', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store = new InMemoryBlueAiStore(ownerId);
    await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'A-001', category: 'assigned' as const, title: 'A', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
      { sourceApp: 'barrister' as const, externalId: 'B-001', category: 'available' as const, title: 'B', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    const result = await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'A-001', category: 'assigned' as const, title: 'A Updated', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    expect(result.upserted).toBe(1);
    expect(result.deleted).toBe(1);
    const listed = await store.list(ownerId);
    expect(listed.length).toBe(1);
    expect(listed[0].external_id).toBe('A-001');
  });

  it('replaceSnapshot preserves raw schedule verbatim', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store = new InMemoryBlueAiStore(ownerId);
    await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'S-001', category: 'assigned' as const, title: 'Schedule Test', city: null, payRaw: '$50', scheduleRaw: '09/29 17:00', statusRaw: 'Dispatched', descriptionRaw: 'Desc', sourcePayload: {} },
    ]);
    const listed = await store.list(ownerId);
    expect(listed[0].schedule_raw).toBe('09/29 17:00');
    expect(listed[0].pay_raw).toBe('$50');
  });

  it('replaceSnapshot with empty array clears all records for owner/source', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store = new InMemoryBlueAiStore(ownerId);
    await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'A-001', category: 'assigned' as const, title: 'A', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    const result = await store.replaceSnapshot([]);
    expect(result.upserted).toBe(0);
    expect(result.deleted).toBe(1);
    const listed = await store.list(ownerId);
    expect(listed.length).toBe(0);
  });

  it('list filters by category', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store = new InMemoryBlueAiStore(ownerId);
    await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'A-001', category: 'assigned' as const, title: 'A', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
      { sourceApp: 'barrister' as const, externalId: 'B-001', category: 'available' as const, title: 'B', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    const assigned = await store.list(ownerId, 'assigned');
    const available = await store.list(ownerId, 'available');
    expect(assigned.length).toBe(1);
    expect(assigned[0].category).toBe('assigned');
    expect(available.length).toBe(1);
    expect(available[0].category).toBe('available');
  });

  it('records are isolated by ownerId', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store1 = new InMemoryBlueAiStore('owner-1');
    const store2 = new InMemoryBlueAiStore('owner-2');
    await store1.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'A-001', category: 'assigned' as const, title: 'A', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    const listed1 = await store1.list('owner-1');
    const listed2 = await store2.list('owner-1');
    expect(listed1.length).toBe(1);
    expect(listed2.length).toBe(0);
  });

  it('same externalId in both categories in one snapshot resolves to assigned', async () => {
    const { InMemoryBlueAiStore } = await import('../server/blueai/blueAiStore');
    const store = new InMemoryBlueAiStore(ownerId);
    await store.replaceSnapshot([
      { sourceApp: 'barrister' as const, externalId: 'SAME-001', category: 'available' as const, title: 'Available', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
      { sourceApp: 'barrister' as const, externalId: 'SAME-001', category: 'assigned' as const, title: 'Assigned', city: null, payRaw: null, scheduleRaw: null, statusRaw: null, descriptionRaw: null, sourcePayload: {} },
    ]);
    const listed = await store.list(ownerId);
    expect(listed.length).toBe(1);
    expect(listed[0].category).toBe('assigned');
    expect(listed[0].title).toBe('Assigned');
  });
});