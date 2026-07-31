import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  TransitBudgetStore,
  getMonthKey,
  getTransitBudgetStore,
  resetTransitBudgetForTests,
} from '../server/transit/transitBudget';

function tmpFile(): string {
  return path.join(os.tmpdir(), `transit-budget-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe('TransitBudgetStore', () => {
  let file: string;

  beforeEach(() => {
    file = tmpFile();
  });

  afterEach(async () => {
    await fs.rm(file, { force: true });
  });

  it('returns a YYYY-MM month key', () => {
    expect(getMonthKey()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('starts empty and reports the normal level with an estimated flag', async () => {
    const store = new TransitBudgetStore({ filePath: file, limit: 100 });
    const s = await store.snapshot();
    expect(s.used).toBe(0);
    expect(s.remaining).toBe(100);
    expect(s.level).toBe('normal');
    expect(s.estimated).toBe(true);
  });

  it('records requests per category and persists to disk', async () => {
    const store = new TransitBudgetStore({ filePath: file, limit: 100 });
    await store.record('nearby');
    await store.record('plan');
    await store.record('nearby');

    const persisted = JSON.parse(await fs.readFile(file, 'utf8'));
    expect(persisted.requestCount).toBe(3);
    expect(persisted.byCategory).toEqual({ nearby: 2, plan: 1 });

    const reopened = new TransitBudgetStore({ filePath: file, limit: 100 });
    const s = await reopened.snapshot();
    expect(s.used).toBe(3);
    expect(s.remaining).toBe(97);
  });

  it('gates categories across the 70/85/95/100 thresholds', async () => {
    const store = new TransitBudgetStore({ filePath: file, limit: 100 });
    for (let i = 0; i < 69; i++) await store.record('nearby');
    expect(await store.canSpend('alerts')).toEqual({ allowed: true });

    await store.record('nearby'); // 70 → warning (nothing blocked yet)
    expect((await store.snapshot()).level).toBe('warning');
    expect(await store.canSpend('alerts')).toEqual({ allowed: true });

    for (let i = 0; i < 15; i++) await store.record('alerts'); // 85 → reduce
    expect((await store.snapshot()).level).toBe('reduce');
    expect(await store.canSpend('alerts')).toEqual({ allowed: false, code: 'reserved' });
    expect(await store.canSpend('networks')).toEqual({ allowed: false, code: 'reserved' });
    expect(await store.canSpend('nearby')).toEqual({ allowed: true });
    expect(await store.canSpend('arrivals')).toEqual({ allowed: true });
    expect(await store.canSpend('plan')).toEqual({ allowed: true });

    for (let i = 0; i < 10; i++) await store.record('nearby'); // 95 → reserve
    expect((await store.snapshot()).level).toBe('reserve');
    expect(await store.canSpend('nearby')).toEqual({ allowed: false, code: 'reserved' });
    expect(await store.canSpend('alerts')).toEqual({ allowed: false, code: 'reserved' });
    expect(await store.canSpend('plan')).toEqual({ allowed: true });
    expect(await store.canSpend('arrivals')).toEqual({ allowed: true });

    for (let i = 0; i < 5; i++) await store.record('plan'); // 100 → exhausted
    expect((await store.snapshot()).level).toBe('exhausted');
    expect(await store.canSpend('plan')).toEqual({ allowed: false, code: 'exhausted' });
    expect(await store.canSpend('arrivals')).toEqual({ allowed: false, code: 'exhausted' });
    expect(await store.canSpend('nearby')).toEqual({ allowed: false, code: 'exhausted' });
  });

  it('resets to a fresh month when the persisted month does not match', async () => {
    await fs.writeFile(
      file,
      JSON.stringify({ month: '1999-01', requestCount: 1400, lastRequestAt: null, byCategory: { nearby: 1400 } })
    );
    const store = new TransitBudgetStore({ filePath: file, limit: 1500 });
    const s = await store.snapshot();
    expect(s.month).toBe(getMonthKey());
    expect(s.used).toBe(0);
  });

  it('resetTransitBudgetForTests rebuilds the shared store', async () => {
    const usageFile = tmpFile();
    process.env.TRANSIT_USAGE_FILE = usageFile;
    try {
      resetTransitBudgetForTests();
      const store = getTransitBudgetStore();
      await store.load();
      await store.record('nearby');
      await store.load();
      expect(JSON.parse(await fs.readFile(usageFile, 'utf8')).requestCount).toBe(1);
      expect((await getTransitBudgetStore().snapshot()).used).toBe(1);
    } finally {
      delete process.env.TRANSIT_USAGE_FILE;
      resetTransitBudgetForTests();
      await fs.rm(usageFile, { force: true });
    }
  });
});
