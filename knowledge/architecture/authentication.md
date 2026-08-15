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

### Local Inventory Verification Mode

For end-to-end UI verification without using credentials, the server exposes a
loopback-only `/api/verification/inventory-session` handshake only when
`NODE_ENV` is not `production` and the server-only
`ENABLE_INVENTORY_VERIFICATION_MODE=true` flag is set. The Vite client also
requires `VITE_INVENTORY_VERIFICATION_MODE=true`. The response is a synthetic
local technician identity, not a Supabase session, and contains no records.
This mode is not compiled into production behavior, does not mint tokens, and
does not relax `requireAuth()` for protected APIs.

### Local Sign-In Bypass

For local UI inspection without a Supabase session, the login page can turn its
existing shield logo into a development-only entry control. It is available
only when all three conditions are true: Vite is running in development mode,
`VITE_LOCAL_AUTH_BYPASS=true`, and the browser hostname is loopback
(`localhost`, `127.0.0.1`, or IPv6 loopback). Activating it sets the existing
client `verificationMode`; it does not mint a Supabase session and does not
bypass authentication on protected backend APIs. Production builds and
non-loopback hosts render the shield as a non-interactive brand mark.

**Worker (`worker/index.ts`):**
- The Worker does not currently validate Supabase bearer tokens.
- Client requests may include tokens, but Worker routes remain callable without
  server-side token verification. This is a known deployment-security gap and
  must not be confused with Express `requireAuth()` behavior.

### Password Reset Flow

1. User clicks "Forgot Password" → `resetPasswordForEmail` sends reset email.
2. The reset email uses `redirectTo: ${window.location.origin}/reset-password`, so local development redirects to `http://localhost:3000/reset-password` and production redirects to the active production origin.
3. User clicks link → lands on `/reset-password` with the Supabase recovery session in the URL.
4. `updatePassword({ password })` completes the flow.

### Authenticated Password Change

Signed-in Supabase users can also change their password from More → Account → Change Password. `ChangePasswordPanel.tsx` validates the new password and confirmation locally, then calls the existing `AuthProvider.updatePassword()` method. It never asks for or stores the old password, never logs password values, and does not touch user email, jobs, lifecycle, proof, inventory, procedure, or other local app data. The panel is disabled with explanatory copy when the app is running in local development bypass mode because that mode is not a real Supabase session.

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
- `src/auth/localAuthBypass.ts` — Development/flag/loopback bypass guard
- `src/auth/ProtectedApp.tsx` — Auth guard (91 lines)
- `src/components/LoginPage.tsx` — Login UI and local-only shield entry control
- `src/components/auth/ChangePasswordPanel.tsx` — authenticated in-app password change form
- `src/lib/supabase.ts` — Supabase client (24 lines)
- `src/services/apiClient.ts` — Auth-fetch wrapper (61 lines)
- `src/main.tsx` — Boot sequence (62 lines)
- `server.ts` — requireAuth middleware (724 lines)

## Related Knowledge

- `api/authentication.md` — Token handling details
- `api/endpoints.md` — Protected endpoints

## Last Updated

2026-08-15 (authenticated Change Password panel and localhost reset redirect verification)
