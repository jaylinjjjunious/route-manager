# Authentication Architecture

2026-10-09 wrapper clarification: the iOS shell loads the live HTTPS website and its existing Supabase auth/same-origin APIs. No client settings are bundled by build:ios. Native and ordinary browser sessions/storage are separate; same-account cloud records are shared. Prior local-origin routing notes describe retained draft helpers, not current loading. See ../../docs/IOS_WRAP.md.

## Purpose

Describes how user authentication works across the frontend and backend.

## Current Implementation

### Auth Provider

Supabase email/password authentication managed by `AuthProvider.tsx`.

**Context:** `AuthContextValue` exposes `session`, `user`, `loading`, `signIn`, `signOut`, `resetPassword`, `updatePassword`, `isAdmin`.

The `isAdmin` flag is derived from the user's `app_metadata.role` or `user_metadata.role` being set to `"admin"`. This enables conditional UI rendering for the Admin Portal entry point in the More screen.

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

2026-10-08 native draft: password recovery redirects use the public HTTPS recovery page, rather than a local Capacitor URL. Automatic return through a native deep link is not implemented. Native release builds explicitly disable local/public workspace bypass flags and require public Supabase client configuration.
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

**Admin Authorization (`server/admin/auth.ts` `requireAdmin()`):**
- Extends `requireAuth()` by verifying the authenticated user has admin role.
- Checks `app_metadata.role === "admin"` or `user_metadata.role === "admin"` via Supabase Admin API.
- Returns 403 `{ error: "Admin access required.", code: "ADMIN_REQUIRED" }` for non-admin users.
- Used by all `/api/admin/*` endpoints.

### Local Inventory Verification Mode

For end-to-end UI verification without using credentials, the server exposes a
loopback-only `/api/verification/inventory-session` handshake only when
`NODE_ENV` is not `production` and the server-only
`ENABLE_INVENTORY_VERIFICATION_MODE=true` flag is set. The Vite client also
requires `VITE_INVENTORY_VERIFICATION_MODE=true`. The response is a synthetic
local technician identity, not a Supabase session, and contains no records.
This mode is not compiled into production behavior, does not mint tokens, and
does not relax `requireAuth()` for protected APIs.

### Local-Only Workspace Entry

The login page offers Continue in Dev Mode when the development/loopback guard passes, or when the existing `VITE_PUBLIC_WORKSPACE_BYPASS=true` build flag is enabled (as in render.yaml). Entry sets verificationMode and provides an in-memory synthetic dev-user-local identity for local UI consumers. It creates no Supabase session or access token. Protected cloud APIs still require real authentication. Signing out clears the synthetic identity. A real session user takes precedence.

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

- `src/auth/AuthProvider.tsx` — Auth context with isAdmin flag
- `src/auth/localAuthBypass.ts` — Development/flag/loopback bypass guard
- `src/auth/ProtectedApp.tsx` — Auth guard (91 lines)
- `src/components/LoginPage.tsx` — Login UI and local-only shield entry control
- `src/components/auth/ChangePasswordPanel.tsx` — authenticated in-app password change form
- `src/lib/supabase.ts` — Supabase client (24 lines)
- `src/services/apiClient.ts` — Auth-fetch wrapper (61 lines)
- `src/main.tsx` — Boot sequence (62 lines)
- `server.ts` — requireAuth middleware (724 lines)
- `server/admin/auth.ts` — requireAdmin middleware and admin role verification

## Related Knowledge

- `api/authentication.md` — Token handling details
- `api/endpoints.md` — Protected endpoints

## Last Updated

2026-10-02 (add admin role authorization, requireAdmin middleware, isAdmin in AuthContext)

Account status and password-change availability use the real session, not the synthetic local user.
