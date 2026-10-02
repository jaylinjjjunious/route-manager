import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "./activityLog";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const serverSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export interface AdminAuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  isAdmin?: boolean;
}

/**
 * Middleware that requires valid Supabase authentication AND admin role.
 * Must be used after requireAuth or includes its own auth check.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[ADMIN] No Bearer token for", req.method, req.path);
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await serverSupabase.auth.getUser(token);

  if (error || !user) {
    console.log("[ADMIN] getUser failed for", req.method, req.path, error?.message || "no user");
    return res.status(401).json({ error: "Invalid or expired token.", code: "AUTH_TOKEN_INVALID" });
  }

  const adminCheck = await isAdmin(user.id);
  if (!adminCheck) {
    console.log("[ADMIN] Non-admin user attempted access:", user.id.slice(0, 8) + "...", req.method, req.path);
    return res.status(403).json({ error: "Admin access required.", code: "ADMIN_REQUIRED" });
  }

  console.log("[ADMIN] Admin verified OK for user", user.id.slice(0, 8) + "...", req.method, req.path);
  (req as AdminAuthenticatedRequest).userId = user.id;
  (req as AdminAuthenticatedRequest).userEmail = user.email;
  (req as AdminAuthenticatedRequest).isAdmin = true;
  next();
}

/**
 * Middleware that requires authentication but allows any authenticated user.
 * Attaches user info to request for use in activity logging.
 */
export async function requireAuthWithUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[AUTH] No Bearer token for", req.method, req.path);
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await serverSupabase.auth.getUser(token);

  if (error || !user) {
    console.log("[AUTH] getUser failed for", req.method, req.path, error?.message || "no user");
    return res.status(401).json({ error: "Invalid or expired token.", code: "AUTH_TOKEN_INVALID" });
  }

  console.log("[AUTH] Token verified OK for user", user.id.slice(0, 8) + "...", req.method, req.path);
  (req as AdminAuthenticatedRequest).userId = user.id;
  (req as AdminAuthenticatedRequest).userEmail = user.email;
  next();
}