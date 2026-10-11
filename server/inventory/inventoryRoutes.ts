import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustodyLedger } from '../../src/services/inventory/chainOfCustody';
import { verifyCustodyLedger } from '../../src/services/inventory/integrity';

export async function validateInventoryLedger(value: unknown, owner: string): Promise<CustodyLedger> {
  const ledger = value as CustodyLedger;
  const text = (value: unknown, max = 200) => typeof value === 'string' && value.length <= max;
  if (!ledger || ledger.version !== 1 || !text(ledger.jobId) || !ledger.jobId
    || !['merchandising', 'contract_parts'].includes(ledger.domain) || ledger.ownerId !== owner
    || (ledger.storeName !== undefined && !text(ledger.storeName, 200)) || (ledger.address !== undefined && !text(ledger.address, 1000))
    || !Array.isArray(ledger.events) || ledger.events.length > 200 || !Array.isArray(ledger.items) || ledger.items.length > 100)
    throw new Error('Invalid inventory ledger.');
  const itemIds = new Set(ledger.items.map(item => item.id));
  const eventIds = new Set(ledger.events.map(event => event.id));
  if (itemIds.size !== ledger.items.length || eventIds.size !== ledger.events.length) throw new Error('Duplicate inventory identity.');
  for (const item of ledger.items) {
    const itemEvents = ledger.events.filter(event => event.itemId === item.id);
    const states = { receive_in: 'received', install: 'installed', removal: 'removed', return: 'returned' };
    if (!text(item.id) || !item.id || item.jobId !== ledger.jobId || item.domain !== ledger.domain
      || !text(item.partNumber) || !text(item.serialNumber) || !['received','installed','removed','returned'].includes(item.status)
      || !Array.isArray(item.eventIds) || item.eventIds.some(id => !eventIds.has(id))
      || !Array.isArray(item.evidence) || item.evidence.length > 100 || !itemEvents.length
      || JSON.stringify(item.eventIds) !== JSON.stringify(itemEvents.map(event => event.id))
      || item.status !== states[itemEvents.at(-1)!.type]) throw new Error('Invalid inventory item.');
    const evidenceIds = new Set(item.evidence.map(evidence => evidence.id));
    if (evidenceIds.size !== item.evidence.length) throw new Error('Duplicate evidence identity.');
    for (const evidence of item.evidence) {
      if (!text(evidence.id) || !text(evidence.name, 500) || !['photo','document','receipt'].includes(evidence.kind)
        || !Number.isFinite(Date.parse(evidence.capturedAt))
        || !['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv'].includes(evidence.mimeType)
        || typeof evidence.dataUrl !== 'string' || !new RegExp('^data:' + evidence.mimeType + ';base64,[A-Za-z0-9+/]+={0,2}$').test(evidence.dataUrl))
        throw new Error('Unsupported inventory evidence.');
    }
  }
  for (const event of ledger.events) {
    const item = ledger.items.find(item => item.id === event.itemId);
    if (!text(event.id) || !event.id || !item || event.jobId !== ledger.jobId || event.domain !== ledger.domain
      || !['receive_in','install','removal','return'].includes(event.type) || !Number.isFinite(Date.parse(event.occurredAt))
      || !text(event.partNumber) || !text(event.serialNumber) || !/^[a-f0-9]{64}$/.test(event.hash)
      || !Array.isArray(event.evidenceIds) || event.evidenceIds.some(id => !item.evidence.some(evidence => evidence.id === id))
      || !item.eventIds.includes(event.id) || ![1,2,3,4].includes(event.integrityVersion || 2)
      || event.partNumber !== item.partNumber || event.serialNumber !== item.serialNumber
      || (event.type === 'return' && (!event.receiptNumber?.trim() || !event.trackingNumber?.trim()))
      || (event.coordinates && (!Number.isFinite(event.coordinates.lat) || Math.abs(event.coordinates.lat) > 90 || !Number.isFinite(event.coordinates.lng) || Math.abs(event.coordinates.lng) > 180))) throw new Error('Invalid inventory event.');
  }
  if (!(await verifyCustodyLedger(ledger)).valid) throw new Error('Inventory history needs review.');
  const { ownerEpoch: _epoch, ...stored } = ledger;
  return stored;
}

export function createInventoryRouter(database: SupabaseClient | null) {
  const router = Router();
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const owner = (req as typeof req & { userId?: string }).userId;
    if (!owner) return res.status(401).json({ error: 'Authentication required.' });
    const expected = req.method === 'GET' ? req.query.expectedOwnerId : req.body?.expectedOwnerId;
    if (expected !== owner) return res.status(409).json({ error: 'Account changed. Reload inventory.' });
    if (!database) return res.status(503).json({ error: 'Account inventory storage is unavailable.' });
    next();
  });
  router.get('/custody-ledger', async (req, res) => {
    const owner = (req as typeof req & { userId: string }).userId;
    const { jobId, domain } = req.query;
    if (typeof jobId !== 'string' || !jobId || jobId.length > 200 || !['merchandising','contract_parts'].includes(domain as string))
      return res.status(400).json({ error: 'Invalid inventory selection.' });
    const { data, error } = await database!.from('inventory_custody_ledgers').select('ledger').eq('owner_id', owner).eq('domain', domain).eq('job_id', jobId).maybeSingle();
    if (error) return res.status(503).json({ error: 'Could not load account inventory. Device records are preserved.' });
    res.json({ ledger: data?.ledger || null });
  });
  router.get('/jobs', async (req, res) => {
    const owner = (req as typeof req & { userId: string }).userId;
    const domain = req.query.domain;
    if (!['merchandising','contract_parts'].includes(domain as string)) return res.status(400).json({ error: 'Invalid inventory domain.' });
    const { data, error } = await database!.from('inventory_custody_ledgers').select('job_id,ledger').eq('owner_id',owner).eq('domain',domain).limit(20);
    if (error) return res.status(503).json({ error: 'Could not load account inventory jobs.' });
    res.json({ jobs: (data || []).map(row => ({ id: row.job_id, storeName: row.ledger.storeName || row.job_id, address: row.ledger.address || '', inventoryDomain: domain })) });
  });
  router.post('/custody-ledger', async (req, res) => {
    const owner = (req as typeof req & { userId: string }).userId;
    let ledger: CustodyLedger;
    try { ledger = await validateInventoryLedger(req.body?.ledger, owner); }
    catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid inventory.' }); }
    const { data, error } = await database!.rpc('save_inventory_custody', { p_owner: owner, p_domain: ledger.domain, p_job: ledger.jobId, p_ledger: ledger });
    if (error) return res.status(409).json({ error: 'Inventory conflict or storage limit. Device records are preserved; review before retrying.' });
    res.json({ ledger: data });
  });
  return router;
}
