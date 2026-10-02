import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuthWithUser, AdminAuthenticatedRequest } from "./auth";
import { logActivity } from "./activityLog";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const adminSupabase = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export interface ProbationCheckInRecord {
  owner_id: string;
  month_key: string;
  started_at?: string;
  completed_at?: string;
  device: "phone" | "tablet" | "computer";
  verification_level?: "self_confirmed" | "screenshot_documented" | "provider_verified";
  proof_name?: string;
  proof_data_url?: string;
  provider_receipt_id?: string;
  confirmation_url?: string;
  confirmation_message_id?: string;
  events: Array<{
    type: "opened_ce" | "proof_attached" | "completed";
    at: string;
    device: "phone" | "tablet" | "computer";
  }>;
  updated_at: string;
}

const router = Router();

/**
 * GET /api/probation-check-ins
 * List current user's probation check-in records
 */
router.get("/", requireAuthWithUser, async (req: Request, res: Response) => {
  const userId = (req as AdminAuthenticatedRequest).userId;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!adminSupabase) {
    return res.status(503).json({ error: "Server not configured for durable storage." });
  }

  try {
    const { data, error } = await adminSupabase
      .from("probation_check_ins")
      .select("*")
      .eq("owner_id", userId)
      .order("month_key", { ascending: false });

    if (error) {
      console.error("[PROBATION] Failed to fetch records:", error);
      return res.status(500).json({ error: "Failed to fetch records." });
    }

    res.json({ records: data || [] });
  } catch (err) {
    console.error("[PROBATION] Unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch records." });
  }
});

/**
 * GET /api/probation-check-ins/current
 * Get current month's probation check-in record
 */
router.get("/current", requireAuthWithUser, async (req: Request, res: Response) => {
  const userId = (req as AdminAuthenticatedRequest).userId;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!adminSupabase) {
    return res.status(503).json({ error: "Server not configured for durable storage." });
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
    const { data, error } = await adminSupabase
      .from("probation_check_ins")
      .select("*")
      .eq("owner_id", userId)
      .eq("month_key", monthKey)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
      console.error("[PROBATION] Failed to fetch current record:", error);
      return res.status(500).json({ error: "Failed to fetch record." });
    }

    res.json({ record: data || null });
  } catch (err) {
    console.error("[PROBATION] Unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch record." });
  }
});

/**
 * POST /api/probation-check-ins
 * Create or update a probation check-in record
 * This is called from the client after completing a check-in
 */
router.post("/", requireAuthWithUser, async (req: Request, res: Response) => {
  const userId = (req as AdminAuthenticatedRequest).userId;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!adminSupabase) {
    return res.status(503).json({ error: "Server not configured for durable storage." });
  }

  const {
    monthKey,
    startedAt,
    completedAt,
    device,
    verificationLevel,
    proofName,
    proofDataUrl,
    providerReceiptId,
    confirmationUrl,
    confirmationMessageId,
    events,
  } = req.body;

  if (!monthKey || !device) {
    return res.status(400).json({ error: "Missing required fields: monthKey, device" });
  }

  // Validate monthKey format
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return res.status(400).json({ error: "Invalid monthKey format. Expected YYYY-MM." });
  }

  // Validate device
  if (!["phone", "tablet", "computer"].includes(device)) {
    return res.status(400).json({ error: "Invalid device. Must be phone, tablet, or computer." });
  }

  // Validate verificationLevel
  if (verificationLevel && !["self_confirmed", "screenshot_documented", "provider_verified"].includes(verificationLevel)) {
    return res.status(400).json({ error: "Invalid verificationLevel." });
  }

  const now = new Date().toISOString();

  try {
    // Use upsert to handle both create and update
    const { data, error } = await adminSupabase
      .from("probation_check_ins")
      .upsert({
        owner_id: userId,
        month_key: monthKey,
        started_at: startedAt,
        completed_at: completedAt,
        device,
        verification_level: verificationLevel,
        proof_name: proofName,
        proof_data_url: proofDataUrl,
        provider_receipt_id: providerReceiptId,
        confirmation_url: confirmationUrl,
        confirmation_message_id: confirmationMessageId,
        events: events || [],
        updated_at: now,
      }, {
        onConflict: "owner_id,month_key",
      })
      .select()
      .single();

    if (error) {
      console.error("[PROBATION] Failed to upsert record:", error);
      return res.status(500).json({ error: "Failed to save record." });
    }

    // Log activity for admin visibility
    await logActivity({
      ownerId: userId,
      feature: "probation",
      action: completedAt ? "check_in_completed" : "check_in_started",
      relatedRecordType: "probation_check_in",
      relatedRecordId: `${userId}:${monthKey}`,
      summary: completedAt
        ? `Completed probation check-in for ${monthKey} (${verificationLevel || "self_confirmed"})`
        : `Started probation check-in for ${monthKey}`,
      metadata: {
        monthKey,
        device,
        verificationLevel,
        hasProof: !!proofDataUrl,
      },
    });

    res.json({ record: data });
  } catch (err) {
    console.error("[PROBATION] Unexpected error:", err);
    res.status(500).json({ error: "Failed to save record." });
  }
});

/**
 * POST /api/probation-check-ins/sync
 * Sync multiple local records to server (for migration from localStorage)
 */
router.post("/sync", requireAuthWithUser, async (req: Request, res: Response) => {
  const userId = (req as AdminAuthenticatedRequest).userId;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!adminSupabase) {
    return res.status(503).json({ error: "Server not configured for durable storage." });
  }

  const { records } = req.body;

  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "Expected records array." });
  }

  const results: Array<{ monthKey: string; success: boolean; error?: string }> = [];

  for (const record of records) {
    try {
      const { error } = await adminSupabase
        .from("probation_check_ins")
        .upsert({
          owner_id: userId,
          month_key: record.monthKey,
          started_at: record.startedAt,
          completed_at: record.completedAt,
          device: record.device,
          verification_level: record.verificationLevel,
          proof_name: record.proofName,
          proof_data_url: record.proofDataUrl,
          provider_receipt_id: record.providerReceiptId,
          confirmation_url: record.confirmationUrl,
          confirmation_message_id: record.confirmationMessageId,
          events: record.events || [],
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "owner_id,month_key",
        });

      if (error) {
        results.push({ monthKey: record.monthKey, success: false, error: error.message });
      } else {
        results.push({ monthKey: record.monthKey, success: true });

        // Log activity for each synced completed record
        if (record.completedAt) {
          await logActivity({
            ownerId: userId,
            feature: "probation",
            action: "check_in_synced",
            relatedRecordType: "probation_check_in",
            relatedRecordId: `${userId}:${record.monthKey}`,
            summary: `Synced probation check-in for ${record.monthKey} (${record.verificationLevel || "self_confirmed"})`,
            metadata: {
              monthKey: record.monthKey,
              device: record.device,
              verificationLevel: record.verificationLevel,
              hasProof: !!record.proofDataUrl,
              syncedAt: new Date().toISOString(),
            },
          });
        }
      }
    } catch (err) {
      results.push({
        monthKey: record.monthKey,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  res.json({ results });
});

export default router;