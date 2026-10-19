import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, AdminAuthenticatedRequest } from "./auth";

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

const router = Router();

/**
 * GET /api/admin/activity
 * Get activity log with filtering
 * Query params:
 * - limit (default 100, max 500)
 * - offset (default 0)
 * - feature (filter by feature)
 * - action (filter by action)
 * - ownerId (filter by user - admin only)
 * - from (ISO date)
 * - to (ISO date)
 */
router.get("/activity", requireAdmin, async (req: Request, res: Response) => {
  if (!adminSupabase) {
    return res.status(503).json({ error: "Server not configured for admin access." });
  }

  const {
    limit = "100",
    offset = "0",
    feature,
    action,
    ownerId,
    from,
    to,
  } = req.query;

  const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 100, 1), 500);
  const offsetNum = Math.max(parseInt(offset as string, 10) || 0, 0);

  try {
    let query = adminSupabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (feature) {
      query = query.eq("feature", feature as string);
    }
    if (action) {
      query = query.eq("action", action as string);
    }
    if (ownerId) {
      query = query.eq("owner_id", ownerId as string);
    }
    if (from) {
      query = query.gte("created_at", from as string);
    }
    if (to) {
      query = query.lte("created_at", to as string);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[ADMIN] Failed to fetch activity:", error);
      return res.status(500).json({ error: "Failed to fetch activity log." });
    }

    res.json({
      activities: data || [],
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || 0,
      },
    });
  } catch (err) {
    console.error("[ADMIN] Unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch activity log." });
  }
});

/**
 * GET /api/admin/probation
 * Get probation check-in records with filtering
 * Query params:
 * - limit (default 50, max 200)
 * - offset (default 0)
 * - ownerId (filter by user)
 * - monthKey (filter by month, YYYY-MM)
 * - completed (true/false)
 * - from (ISO date for completed_at)
 * - to (ISO date for completed_at)
 */
router.get("/probation", requireAdmin, async (req: Request, res: Response) => {
  if (!adminSupabase) {
    return res.status(503).json({ error: "Server not configured for admin access." });
  }

  const {
    limit = "50",
    offset = "0",
    ownerId,
    monthKey,
    completed,
    from,
    to,
  } = req.query;

  const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 200);
  const offsetNum = Math.max(parseInt(offset as string, 10) || 0, 0);

  try {
    let query = adminSupabase
      .from("probation_check_ins")
      .select("*", { count: "exact" })
      .order("month_key", { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (ownerId) {
      query = query.eq("owner_id", ownerId as string);
    }
    if (monthKey) {
      query = query.eq("month_key", monthKey as string);
    }
    if (completed === "true") {
      query = query.not("completed_at", "is", null);
    } else if (completed === "false") {
      query = query.is("completed_at", null);
    }
    if (from) {
      query = query.gte("completed_at", from as string);
    }
    if (to) {
      query = query.lte("completed_at", to as string);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[ADMIN] Failed to fetch probation records:", error);
      return res.status(500).json({ error: "Failed to fetch probation records." });
    }

    res.json({
      records: data || [],
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || 0,
      },
    });
  } catch (err) {
    console.error("[ADMIN] Unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch probation records." });
  }
});

/**
 * GET /api/admin/overview
 * Get summary statistics for admin dashboard
 */
router.get("/overview", requireAdmin, async (req: Request, res: Response) => {
  if (!adminSupabase) {
    return res.status(503).json({ error: "Server not configured for admin access." });
  }

  try {
    const [
      { count: totalActivity, error: activityError },
      { count: totalProbation, error: probationError },
      { data: recentActivity, error: recentError },
      { data: recentProbation, error: recentProbationError },
    ] = await Promise.all([
      adminSupabase.from("activity_log").select("*", { count: "exact", head: true }),
      adminSupabase.from("probation_check_ins").select("*", { count: "exact", head: true }),
      adminSupabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      adminSupabase
        .from("probation_check_ins")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(10),
    ]);

    if (activityError || probationError || recentError || recentProbationError) {
      console.error("[ADMIN] Failed to fetch overview:", { activityError, probationError, recentError, recentProbationError });
      return res.status(500).json({ error: "Failed to fetch overview." });
    }

    const completedProbation = (recentProbation || []).filter(r => r.completed_at).length;
    const pendingProbation = (recentProbation || []).filter(r => !r.completed_at).length;

    res.json({
      stats: {
        totalActivity: totalActivity || 0,
        totalProbation: totalProbation || 0,
        completedProbation,
        pendingProbation,
      },
      recentActivity: recentActivity || [],
      recentProbation: recentProbation || [],
    });
  } catch (err) {
    console.error("[ADMIN] Unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch overview." });
  }
});

export default router;