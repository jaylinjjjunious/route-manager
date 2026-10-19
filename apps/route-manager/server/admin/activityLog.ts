import { Request } from "express";
import { createClient } from "@supabase/supabase-js";

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

export interface ActivityLogEntry {
  ownerId: string;
  feature: string;
  action: string;
  relatedRecordType?: string;
  relatedRecordId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

/**
 * Shared activity logging helper.
 * Uses service role to bypass RLS for cross-user admin visibility.
 * Call this from server-side route handlers after successful operations.
 */
export async function logActivity(entry: ActivityLogEntry): Promise<{ success: boolean; error?: string }> {
  if (!adminSupabase) {
    console.warn("[ACTIVITY] Service role not configured; skipping activity log");
    return { success: false, error: "Service role not configured" };
  }

  try {
    const { error } = await adminSupabase.from("activity_log").insert({
      owner_id: entry.ownerId,
      feature: entry.feature,
      action: entry.action,
      related_record_type: entry.relatedRecordType,
      related_record_id: entry.relatedRecordId,
      summary: entry.summary,
      metadata: entry.metadata || {},
    });

    if (error) {
      console.error("[ACTIVITY] Failed to insert activity log:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[ACTIVITY] Unexpected error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Extract user ID from authenticated request.
 * Requires requireAuth middleware to have run first.
 */
export function getUserIdFromRequest(req: Request): string | null {
  return (req as any).userId || null;
}

/**
 * Check if a user has admin role.
 * Admin role is stored in user's app_metadata (server-controlled).
 */
export async function isAdmin(userId: string): Promise<boolean> {
  if (!adminSupabase) return false;

  try {
    const { data: { user }, error } = await adminSupabase.auth.admin.getUserById(userId);
    if (error || !user) return false;
    return user.app_metadata?.role === "admin";
  } catch {
    return false;
  }
}
