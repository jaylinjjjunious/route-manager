# Authentication Architecture

## Purpose

Describes how user authentication works across the frontend and backend.

## Current Implementation

### Auth Provider

Supabase email/password authentication managed by `AuthProvider.tsx`.

**Context:** `AuthContextValue` exposes `session`, `user`, `loading`, `signIn`, `signOut`, `resetPassword`, `updatePassword`, `isAdmin`.

The `isAdmin` flag is derived from the user's `app_metadata.role` being set to `"admin"`. This enables conditional UI rendering for the Admin Portal entry point in the More screen.

**Boot sequence (main.tsx):**
1. Render `StartupScreen` while loading.
2. Dynamically import `supabase.ts` to validate config.
3. Render `StrictMode > DebugProvider > AuthProvider > ProtectedApp`.

**ProtectedApp routing:**
- `/login` → LoginPage
- `/forgot-password` → ForgotPasswordPage
- `/reset-password` → ResetPasswordPage
- Parent `/` → independent public hallway (no account records); `/route-manager/` → owner-keyed App if authenticated, otherwise existing LoginPage. Prefixed and legacy root login/reset/forgot-password URLs remain supported. SoftwareShell is removed; login/sign-out stays within Route Manager. Same-origin hosting preserves Supabase/browser storage keys, and no session token is passed through links. Cleaning now uses its own Supabase client with the same default session storage; it offers independent sign-in and never imports room auth code. Hallway still reads no account data.

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

**Admin Authorization (`server/admin/auth.ts` `requireAdmin()`):**
- Extends `requireAuth()` by verifying the authenticated user has admin role.
- Checks `app_metadata.role === "admin"` via Supabase Admin API.
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

### Isolated guest workspace (2026-10-25)

**Bypass sign-in** enters a dedicated `GuestApp` inside Route Manager. `ProtectedApp` records explicit guest entry in sessionStorage (`aio-route-manager-guest-mode:v1`), retaining it through reload and hallway round trips in that tab. It never creates a user, token, admin role or verificationMode. A real session always takes precedence and clears the guest entry marker. Guest Sign in clears the marker and opens login without moving or importing guest jobs.

GuestApp uses only `aio-route-manager-guest-plan:v1` in localStorage. It mounts no account App, imports no account feature stores and makes no protected API calls. Today/Jobs, local job creation/editing/completion/reopening, starting address and external Google Maps directions are usable without credentials. No demo/private data is seeded. Cloud sync, account jobs, proofs, inventory and admin tools remain sign-in-only, explicitly disclosed. Guest data is browser-local, accessible to anyone using that browser, and lost if browser data is cleared. Storage read failures preserve the original guest record and block writes; write failures retain the last saved state with a visible error. Cleaning is unchanged.

This supersedes the earlier main-menu-only link, which the user rejected because opening Route Manager returned to login. See decisions/2026-10-25-isolated-guest-workspace.md.

### Local-Only Workspace Entry

The login page offers Continue in Dev Mode only when the development/loopback guard and `VITE_LOCAL_AUTH_BYPASS=true` pass. The public-workspace flag does not enable this guard; render.yaml sets it false. Entry sets verificationMode and provides an in-memory synthetic dev-user-local identity for local UI consumers. It creates no Supabase session or access token. Protected cloud APIs still require real authentication. Signing out clears the synthetic identity. A real session user takes precedence. This development control is separate from the isolated guest workspace above.

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
