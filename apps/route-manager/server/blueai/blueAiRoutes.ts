import express, { type Request, type RequestHandler } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { BlueAiSupabaseStore, BlueAiFileStore, BlueAiStore, InMemoryBlueAiStore, BlueAiStoredRecord, BlueAiStoreInterface } from './blueAiStore';
import { InvalidBlueAiPayload, normalizeBlueAiPayload, normalizeBarristerExport } from './blueAiPayload';
import path from 'node:path';
import os from 'node:os';

export interface BlueAiConfig {
  token?: string;
  ownerId?: string;
  admin?: SupabaseClient;
  dataDir?: string;
}

function createFileStore(config: BlueAiConfig): BlueAiFileStore | null {
  if (!config.dataDir || !config.ownerId) return null;
  const dir = path.isAbsolute(config.dataDir) ? config.dataDir : path.join(os.tmpdir(), config.dataDir);
  return new BlueAiFileStore(dir, config.ownerId);
}

function createLegacyStore(config: BlueAiConfig): BlueAiStore | null {
  if (!config.dataDir) return null;
  const dir = path.isAbsolute(config.dataDir) ? config.dataDir : path.join(os.tmpdir(), config.dataDir);
  return new BlueAiStore(dir);
}

function createInMemoryStore(config: BlueAiConfig): InMemoryBlueAiStore | null {
  if (!config.ownerId) return null;
  return new InMemoryBlueAiStore(config.ownerId);
}

export function createBlueAiRouter(requireAuth: RequestHandler, config: BlueAiConfig = {
  token: process.env.BLUEAI_INGEST_TOKEN,
  ownerId: process.env.BLUEAI_OWNER_ID,
  admin: undefined,
  dataDir: process.env.BLUEAI_DATA_DIR,
}) {
  const router = express.Router();
  const enabled = !!(config.token && config.token.length >= 32 &&
    config.ownerId && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(config.ownerId));
  const supabaseStore = (enabled && config.admin) ? new BlueAiSupabaseStore(config.admin, config.ownerId!) : null;
  const fileStore = (enabled && config.dataDir) ? createFileStore(config) : null;
  const legacyStore = (enabled && config.dataDir) ? createLegacyStore(config) : null;
  const memoryStore = (enabled && !config.admin && !config.dataDir) ? createInMemoryStore(config) : null;
  const store: BlueAiStoreInterface = supabaseStore ?? fileStore ?? memoryStore;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  let windowStart = Date.now();
  let writes = 0;

  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  // Export endpoint - works with Supabase, file, and in-memory stores
  router.post('/export', (req, res, next) => {
    if (!store) return res.status(503).json({ error: 'BlueAI export bridge is not configured.' });
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ') || !timingSafeEqual(digest(header.slice(7)), digest(config.token!))) {
      return res.status(401).json({ error: 'Invalid bridge credentials.' });
    }
    if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); writes = 0; }
    if (++writes > 10) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'Try again later.' }); }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Use application/json.' });
    next();
  }, express.json({ limit: '64kb' }), async (req, res) => {
    try {
      const records = normalizeBarristerExport(req.body, config.ownerId!);
      const result = await store.replaceSnapshot(records);
      res.json({ assigned: records.filter(r => r.category === 'assigned').length, available: records.filter(r => r.category === 'available').length, ...result });
    } catch (error) {
      if (error instanceof InvalidBlueAiPayload) return res.status(400).json({ error: error.message });
      console.error('[BlueAI] Export upsert failed:', error);
      res.status(503).json({ error: 'Unable to persist export. Retry the same snapshot.' });
    }
  });

  // Records GET endpoint - works with all stores
  router.get('/records', requireAuth, async (req, res) => {
    const ownerId = (req as Request & { userId?: string }).userId;
    if (!ownerId) return res.status(401).json({ error: 'Authentication required.' });
    if (!store) return res.json({ enabled: false, reason: 'not_configured', assigned: [], available: [] });
    if (ownerId !== config.ownerId) return res.json({ enabled: false, reason: 'account_mismatch', assigned: [], available: [] });
    try {
      const category = req.query.category as 'assigned' | 'available' | undefined;
      const records = await store.list(ownerId, category);
      const mapped = records.map(r => ({
        id: r.id,
        sourceApp: r.source_app,
        externalId: r.external_id,
        category: r.category,
        title: r.title,
        city: r.city,
        payRaw: r.pay_raw,
        scheduleRaw: r.schedule_raw,
        statusRaw: r.status_raw,
        descriptionRaw: r.description_raw,
        receivedAt: r.received_at,
        updatedAt: r.updated_at,
        revision: r.revision,
      }));
      res.json({ enabled: true, assigned: mapped.filter(r => r.category === 'assigned'), available: mapped.filter(r => r.category === 'available') });
    } catch {
      res.status(503).json({ error: 'Unable to read records. Try again later.' });
    }
  });

  // Legacy single-job endpoint - uses original BlueAiStore for backward compatibility
  router.post('/jobs', (req, res, next) => {
    if (!legacyStore) return res.status(503).json({ error: 'BlueAI bridge is not configured (legacy mode requires BLUEAI_DATA_DIR).' });
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ') || !timingSafeEqual(digest(header.slice(7)), digest(config.token!))) {
      return res.status(401).json({ error: 'Invalid bridge credentials.' });
    }
    if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); writes = 0; }
    if (++writes > 60) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'Try again later.' }); }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Use application/json.' });
    next();
  }, express.json({ limit: '16kb' }), async (req, res) => {
    try {
      const job = normalizeBlueAiPayload(req.body, config.ownerId!);
      const result = await legacyStore.upsert(job);
      res.status(result.action === 'created' ? 201 : 200).json(result);
    } catch (error) {
      if (error instanceof InvalidBlueAiPayload) return res.status(400).json({ error: error.message });
      res.status(503).json({ error: 'Unable to persist job. Retry the same source ID.' });
    }
  });

  // Legacy jobs GET endpoint - works with original BlueAiStore
  router.get('/jobs', requireAuth, async (req, res) => {
    const ownerId = (req as Request & { userId?: string }).userId;
    if (!ownerId) return res.status(401).json({ error: 'Authentication required.' });
    if (!legacyStore || ownerId !== config.ownerId) return res.json({ enabled: false, jobs: [] });
    try {
      const jobs = await legacyStore.list(ownerId);
      res.json({ enabled: true, jobs });
    } catch {
      res.status(503).json({ error: 'Unable to read jobs. Try again later.' });
    }
  });

  router.use((error: { type?: string }, _req: Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid JSON request body.' });
  });

  return router;
}
