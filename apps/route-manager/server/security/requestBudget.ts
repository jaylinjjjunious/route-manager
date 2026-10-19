import type { RequestHandler } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

type Policy = { minute: number; month: number; concurrent: number };
type Counter = { count: number; month: string };
export interface DurableBudgetStore {
  admit(owner: string, group: string, month: string, limit: number): Promise<boolean>;
}
/** Persistent admission limits. Fail closed on corrupt storage, never reset spend on restart. */
export function createRequestBudget(file = path.resolve('.local-security-budget/usage.json'), durable?: DurableBudgetStore) {
  let serial = Promise.resolve();
  const recent = new Map<string, number[]>();
  const active = new Map<string, number>();
  const policies: Record<string, Policy> = {
    ai: { minute: 10, month: 600, concurrent: 2 },
    transit: { minute: 3, month: 500, concurrent: 2 },
    proof: { minute: 3, month: 100, concurrent: 1 },
    probation: { minute: 10, month: 200, concurrent: 1 },
    inventory: { minute: 10, month: 200, concurrent: 1 },
  };
  return ((req, res, next) => {
    const route = req.path;
    const group = /^\/(assistant|dispatcher|import)(\/|$)/.test(route) ? 'ai'
      : route.startsWith('/transit/') && route !== '/transit/status' ? 'transit'
      : req.method === 'POST' && route === '/shower-proofs' ? 'proof'
      : req.method === 'POST' && route.startsWith('/probation-check-ins') ? 'probation'
      : req.method === 'POST' && route.startsWith('/inventory/') ? 'inventory' : null;
    if (!group) return next();
    const owner = (req as typeof req & { userId?: string }).userId;
    if (!owner) { res.status(401).json({ error: 'Authentication required.' }); return; }
    const key = `${group}:${owner}`;
    const policy = policies[group];
    const task = serial.then(async () => {
      if (req.destroyed || res.destroyed) return;
      const now = Date.now();
      const month = new Date(now).toISOString().slice(0, 7);
      let counts: Record<string, Counter> = {};
      try { if (!durable) counts = JSON.parse(await fs.readFile(file, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      const calls = (recent.get(key) || []).filter(at => now - at < 60_000);
      const counter = counts[key]?.month === month ? counts[key].count : 0;
      const inFlight = active.get(key) || 0;
      const globalActive = [...active.entries()].filter(([name]) => name.startsWith(`${group}:`)).reduce((sum, [, count]) => sum + count, 0);
      if (globalActive >= (group === "ai" || group === "proof" ? 2 : 4) || calls.length >= policy.minute || counter >= policy.month || inFlight >= policy.concurrent) {
        res.setHeader('Retry-After', '60');
        res.status(429).json({ error: 'Account request limit reached. Please retry later.', code: 'ACCOUNT_QUOTA_EXCEEDED' });
        return;
      }
      counts = Object.fromEntries(Object.entries(counts).filter(([, value]) => value.month === month));
      if (Object.keys(counts).length >= 5000 && !counts[key]) throw new Error('Budget capacity reached.');
      counts[key] = { count: counter + 1, month };
      if (durable) {
        if (!await durable.admit(owner, group, month, policy.month)) {
          res.status(429).json({ error: 'Monthly account request limit reached.', code: 'ACCOUNT_QUOTA_EXCEEDED' });
          return;
        }
      } else {
        if (process.env.NODE_ENV === 'production') throw new Error('Durable accounting is required in production.');
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(`${file}.tmp`, JSON.stringify(counts));
        await fs.rename(`${file}.tmp`, file);
      }
      recent.set(key, [...calls, now]);
      active.set(key, inFlight + 1);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        active.set(key, Math.max(0, (active.get(key) || 1) - 1));
      };
      res.once('finish', release);
      // An aborted client must not immediately free a still-running provider call,
      // but must not permanently occupy the shared concurrency allowance either.
      res.once('close', () => {
        if (!released) setTimeout(release, 120_000).unref();
      });
      // Keep minute counters bounded without discarding an active owner's allowance.
      for (const [storedKey, times] of recent) {
        if (times.every(at => now - at >= 60_000) && !active.get(storedKey)) {
          recent.delete(storedKey); active.delete(storedKey);
        }
      }
      next();
    });
    serial = task.catch(() => {
      if (!res.headersSent) res.status(503).json({ error: 'Request accounting is unavailable. Please retry.' });
    });
  }) satisfies RequestHandler;
}
