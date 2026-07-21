# Authentication Architecture

## Purpose

Describes how user authentication works across the frontend and backend.

## Current Implementation

### Auth Provider

Supabase email/password authentication managed by `AuthProvider.tsx`.

**Context:** `AuthContextValue` exposes `session`, `user`, `loading`, `signIn`, `signOut`, `resetPassword`, `updatePassword`.

**Boot sequence (main.tsx):**
1. Render `StartupScreen` while loading.
2. Dynamically import `supabase.ts` to validate config.
3. Render `StrictMode > DebugProvider > AuthProvider > ProtectedApp`.

**ProtectedApp routing:**
- `/login` → LoginPage
- `/forgot-password` → ForgotPasswordPage
- `/reset-password` → ResetPasswordPage
- `/` → App (if authenticated) or LoginPage

**Session recovery:**
- `supabase.auth.getSession()` on mount recovers existing session.
- `onAuthStateChange` listener updates session state.
- Supabase stores session in localStorage for page refresh recovery.

### API Authentication

**Frontend (`apiClient.ts`):**
- `authFetch()` gets the current session token from `supabase.auth.getSession()`.
- Attaches `Authorization: Bearer <token>` header.
- On 401 response, throws with `reason: 'auth_required'` for the caller to handle.
- Tracks request diagnostics (method, URL, timing, status).

**Backend (`server.ts` `requireAuth()`):**
- Extracts Bearer token from Authorization header.
- Calls `supabaseAdmin.auth.getUser(token)` to verify.
- Attaches `req.user` with user metadata.
- Returns 401 JSON response on failure.

**Worker (`worker/index.ts`):**
- Shower proof endpoints use the same Bearer token pattern.
- Token is verified via Supabase `getUser()`.
- Legacy `/api/shower-proof` endpoint had simpler auth.

### Password Reset Flow

1. User clicks "Forgot Password" → `resetPasswordForEmail` sends reset email.
2. User clicks link → lands on `/reset-password` with access_token in URL.
3. `updatePassword({ password })` completes the flow.

### Secrets and Environment

Required env vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (safe for client)
- `SUPABASE_JWT_SECRET` — Server-only, used by `requireAuth()`

## Security Rules

- Supabase anon key is safe to expose to the client.
- JWT secret is server-only and never committed.
- `.env` files are gitignored and must never be committed.
- The auth check endpoint (`/api/debug/auth-check`) is unauthenticated but only returns public metadata.
- All shower proof and dispatcher endpoints require JWT auth.

## Edge Cases

- **Expired session**: `authFetch` gets fresh token; if refresh fails, caller must redirect to login.
- **Token refresh race**: Multiple simultaneous requests may all attempt refresh; each uses separate `supabase.auth.refreshSession()` call.
- **No session on first load**: ProtectedApp shows loading screen, then login page.
- **Session lost during ride**: Backend calls fail with 401; App does not auto-redirect (ride mode continues).

## Related Source Files

- `src/auth/AuthProvider.tsx` — Auth context (141 lines)
- `src/auth/ProtectedApp.tsx` — Auth guard (91 lines)
- `src/lib/supabase.ts` — Supabase client (24 lines)
- `src/services/apiClient.ts` — Auth-fetch wrapper (61 lines)
- `src/main.tsx` — Boot sequence (62 lines)
- `server.ts` — requireAuth middleware (724 lines)

## Related Knowledge

- `api/authentication.md` — Token handling details
- `api/endpoints.md` — Protected endpoints

## Last Updated

2026-07-20 (c12bd44)
