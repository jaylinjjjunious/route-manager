import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createRequestBudget } from '../server/security/requestBudget';
import { validateProofImage } from '../server/security/proofImage';
import { normalizeProbationRecord } from '../server/admin/probationRecord';
import { readOwnedStorage, writeOwnedStorage, setStorageOwner } from '../src/utils/ownerStorage';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
async function budgetServer(file: string) {
  const app = express();
  app.use((req, _res, next) => { (req as typeof req & { userId: string }).userId = String(req.headers['x-test-owner'] || 'owner-a'); next(); });
  app.use(createRequestBudget(file));
  app.get('/transit/nearby-stops', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  cleanups.push(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address() as { port: number };
  return (owner = 'owner-a') => fetch(`http://127.0.0.1:${address.port}/transit/nearby-stops`, { headers: { 'x-test-owner': owner } });
}
async function budgetFile() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'route-budget-test-'));
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  return path.join(root, 'usage.json');
}
describe('security admission budgets', () => {
  it('retains aborted work briefly, then releases its concurrency slot', async () => {
    vi.useFakeTimers();
    try {
      const budget = createRequestBudget('unused', { admit: async () => true });
      const request = { path: '/probation-check-ins', method: 'POST', userId: 'owner-a', destroyed: false } as unknown as Request;
      const response = new EventEmitter() as EventEmitter & { destroyed: boolean; headersSent: boolean; setHeader: () => void; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
      Object.assign(response, { destroyed: false, headersSent: false, setHeader: () => {}, status: vi.fn(() => response), json: vi.fn() });
      await new Promise<void>(resolve => budget(request, response as unknown as Response, () => resolve()));
      response.emit('close');
      const blocked = vi.fn();
      budget(request, response as unknown as Response, blocked);
      await vi.advanceTimersByTimeAsync(0);
      expect(blocked).not.toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(429);
      await vi.advanceTimersByTimeAsync(120_000);
      await new Promise<void>(resolve => budget(request, response as unknown as Response, () => resolve()));
      response.emit('finish');
    } finally { vi.useRealTimers(); }
  });
  it('admits the Tools screen pair of simultaneous transit requests', async () => {
    const app = express();
    app.use((req, _res, next) => { (req as typeof req & { userId: string }).userId = 'owner-a'; next(); });
    app.use(createRequestBudget(await budgetFile()));
    app.get(['/transit/nearby-stops', '/transit/alerts'], (_req, res) => setTimeout(() => res.json({ ok: true }), 50));
    const server = app.listen(0);
    await new Promise<void>(resolve => server.once('listening', resolve));
    cleanups.push(() => new Promise<void>(resolve => server.close(() => resolve())));
    const address = server.address() as { port: number };
    const responses = await Promise.all(['/transit/nearby-stops', '/transit/alerts'].map(route => fetch(`http://127.0.0.1:${address.port}${route}`)));
    expect(responses.map(response => response.status)).toEqual([200, 200]);
  });
  it('limits one owner without spending another owner allowance', async () => {
    const request = await budgetServer(await budgetFile());
    for (let index = 0; index < 3; index++) expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(429);
    expect((await request('owner-b')).status).toBe(200);
  });
  it('preserves monthly caps across a fresh middleware instance', async () => {
    const file = await budgetFile();
    await fs.writeFile(file, JSON.stringify({ 'transit:owner-a': { month: new Date().toISOString().slice(0, 7), count: 500 } }));
    const request = await budgetServer(file);
    expect((await request()).status).toBe(429);
    const requestAfterRestart = await budgetServer(file);
    expect((await requestAfterRestart()).status).toBe(429);
  });
  it('fails closed if stored accounting is corrupt', async () => {
    const file = await budgetFile(); await fs.writeFile(file, '{invalid');
    expect((await (await budgetServer(file))()).status).toBe(503);
  });
});
async function barcodePhoto(value: string) {
  const patterns = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const left = value.slice(0, 6).split('').map(digit => patterns[Number(digit)]).join('');
  const right = value.slice(6).split('').map(digit => patterns[Number(digit)].split('').map(bit => bit === '1' ? '0' : '1').join('')).join('');
  const bits = `000000000000101${left}01010${right}101000000000000`;
  const width = bits.length * 4, height = 200;
  const pixels = Buffer.alloc(width * height, 255);
  for (let y = 20; y < 180; y++) for (let x = 0; x < width; x++) if (bits[Math.floor(x / 4)] === '1') pixels[y * width + x] = 0;
  return sharp(pixels, { raw: { width, height, channels: 1 } }).png().toBuffer();
}
describe('proof image verification', () => {
  it('decodes and re-encodes a photo containing the required product barcode', async () => {
    const output = await validateProofImage(await barcodePhoto('075371003233'), '075371003233');
    expect((await sharp(output).metadata()).format).toBe('jpeg');
  });
  it('rejects non-image bytes and a picture containing the wrong barcode', async () => {
    await expect(validateProofImage(Buffer.from('<script>fake image</script>'), '075371003233')).rejects.toThrow();
    await expect(validateProofImage(await barcodePhoto('012345678905'), '075371003233')).rejects.toThrow('could not be verified');
  });
  it('rejects expanded images exceeding the pixel cap before processing', async () => {
    const oversized = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: '#ffffff' } }).png().toBuffer();
    await expect(validateProofImage(oversized, '075371003233')).rejects.toThrow();
  });
});
it('rejects arbitrary past and future probation storage months', () => {
  for (const monthKey of ['0001-01', '9999-12']) expect(() => normalizeProbationRecord({ monthKey, device: 'phone', events: [] })).toThrow('24-month');
});
it('isolates stored scans and conversations without adopting or deleting unowned legacy data', () => {
  localStorage.clear();
  const key = 'assistant_conversation';
  localStorage.setItem(key, 'unowned historical data');
  setStorageOwner('owner-a');
  expect(readOwnedStorage(key)).toBeNull();
  writeOwnedStorage(key, 'account A');
  setStorageOwner('owner-b');
  expect(readOwnedStorage(key)).toBeNull();
  writeOwnedStorage(key, 'account B');
  setStorageOwner(null);
  expect(readOwnedStorage(key)).toBeNull();
  setStorageOwner('owner-a');
  expect(readOwnedStorage(key)).toBe('account A');
  expect(localStorage.getItem(key)).toBe('unowned historical data');
  setStorageOwner(null);
});
