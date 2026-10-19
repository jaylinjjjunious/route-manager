import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuthWithUser, AdminAuthenticatedRequest } from "./auth";
import { normalizeProbationRecord, probationRequestKey } from "./probationRecord";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const database = serviceKey ? createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "", serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null;
const router = Router();
router.use(requireAuthWithUser);
router.use((req: Request, res: Response, next) => {
  const ownerId = (req as AdminAuthenticatedRequest).userId;
  if (!ownerId) return res.status(401).json({ error: "Authentication required." });
  if (req.body?.expectedOwnerId && req.body.expectedOwnerId !== ownerId) return res.status(409).json({ error: "Account changed. Reload before saving." });
  if (!database) return res.status(503).json({ error: "Account storage is not configured." });
  next();
});
router.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await database!.from("probation_check_ins").select("*")
      .eq("owner_id", (req as AdminAuthenticatedRequest).userId).order("month_key", { ascending: false }).limit(24);
    if (error) throw error;
    res.json({ records: data || [] });
  } catch { res.status(503).json({ error: "Could not load account check-ins. Please retry." }); }
});
router.get("/current", async (req: Request, res: Response) => {
  const month = typeof req.query.month === "string" ? req.query.month : new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: "Invalid reporting month." });
  try {
    const { data, error } = await database!.from("probation_check_ins").select("*")
      .eq("owner_id", (req as AdminAuthenticatedRequest).userId).eq("month_key", month).maybeSingle();
    if (error) throw error;
    res.json({ record: data });
  } catch { res.status(503).json({ error: "Could not load account check-in. Please retry." }); }
});
async function save(ownerId: string, record: ReturnType<typeof normalizeProbationRecord>) {
  // Bound permanent records and audit growth, including changes to cosmetic fields.
  // No historical rows are deleted or assigned to a different owner.
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [existing, records, activity] = await Promise.all([
    database!.from('probation_check_ins').select('month_key').eq('owner_id', ownerId).eq('month_key', record.monthKey).maybeSingle(),
    database!.from('probation_check_ins').select('month_key', { count: 'exact', head: true }).eq('owner_id', ownerId),
    database!.from('activity_log').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('feature', 'probation').gte('created_at', monthStart.toISOString()),
  ]);
  if (existing.error || records.error || activity.error) throw new Error('Storage accounting unavailable.');
  if ((!existing.data && (records.count ?? 24) >= 24) || (activity.count ?? 200) >= 200) throw new Error('Account storage quota reached.');
  const { data, error } = await database!.rpc("save_probation_with_activity", {
    p_owner_id: ownerId, p_month_key: record.monthKey, p_record: record,
    p_idempotency_key: probationRequestKey(ownerId, record),
  });
  if (error || !data) throw new Error("Account saving is unavailable. Your local record is still pending; please retry.");
  return data;
}
router.post("/", async (req: Request, res: Response) => {
  let record: ReturnType<typeof normalizeProbationRecord>;
  try { record = normalizeProbationRecord(req.body); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid record." }); }
  try { res.json({ record: await save((req as AdminAuthenticatedRequest).userId!, record) }); }
  catch { res.status(503).json({ error: "Account saving is unavailable. Your local record is still pending; please retry." }); }
});
router.post("/sync", async (req: Request, res: Response) => {
  let records: ReturnType<typeof normalizeProbationRecord>[];
  try {
    if (!Array.isArray(req.body.records) || req.body.records.length > 24) throw new Error("Expected at most 24 records.");
    records = req.body.records.map(normalizeProbationRecord);
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid records." }); }
  const results = [];
  for (const record of records) {
    try { results.push({ monthKey: record.monthKey, success: true, record: await save((req as AdminAuthenticatedRequest).userId!, record) }); }
    catch { results.push({ monthKey: record.monthKey, success: false, error: "Could not save record and activity together." }); }
  }
  res.json({ results });
});
export default router;
