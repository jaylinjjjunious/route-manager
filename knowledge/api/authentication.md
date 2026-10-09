# API Authentication

2026-10-09 current wrapper loading: the live HTTPS site uses its existing same-origin API/auth flow. Native local-origin resolver/CORS code remains as draft compatibility support, but is not needed to load the hosted site and has not been deployed. See ../../docs/IOS_WRAP.md.

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `src/services/apiClient.ts`, `server.ts`, `worker/index.ts`

---

## JWT Bearer Token (Supabase)

All protected API endpoints expect a JSON Web Token issued by **Supabase Auth** in the `Authorization` header:

```
Authorization: Bearer <supabase-jwt-token>
```

The token is a standard Supabase JWT containing the user's `sub` (user ID), `email`, `aud`, `exp`, and Supabase-specific claims.

---

## Frontend: `authFetch` / `authFetchJson`

The `apiClient.ts` module exports `authFetch` and `authFetchJson` — wrappers around the native `fetch` API that handle token injection and error recovery.

### Token Injection

1. Retrieve the current session from Supabase (`supabase.auth.getSession()`).
2. Extract the `access_token` from the session.
3. Set the `Authorization: Bearer <token>` header on the outgoing request.

If no session exists, the request proceeds without a token (the backend will reject it with 401).

### 401 Handling & Token Refresh

When a request returns **401 Unauthorized**:

The shared `authFetch` throws an authorization error when the backend rejects an attached token. It does not refresh/retry automatically; Supabase session auto-refresh and the separate shower proof upload retry are distinct mechanisms. The previous shared retry description was stale (corrected 2026-10-08).

### Bundled native requests (2026-10-08 draft)

`apiOrigin.ts` resolves local native requests to the HTTPS Render origin while preserving web URLs. Auth headers and multipart bodies are retained. Express grants CORS only to `capacitor://localhost`; actual API requests still pass through existing authentication/ownership checks. Draft branch changes are not deployed until release verification. See [iOS wrap guide](../../docs/IOS_WRAP.md).

### Error Extraction

`authFetchJson` parses the JSON response body. If it contains `{ error: string }`, that error message is extracted and thrown as an `Error`. Non-OK statuses throw with the server-provided message or a status fallback.

---

## Backend: `requireAuth` Middleware (Express)

The Express server (`server.ts`) uses a `requireAuth` middleware function on protected routes.

### Flow

1. Extract the `Authorization` header from the request.
2. Parse the `Bearer <token>` format.
3. Call `supabase.auth.getUser(token)` to validate the token against Supabase's API.
4. If valid, attach the user object to `req.user` and call `next()`.
5. If invalid or missing, respond with **401** `{ error: "Unauthorized" }`.

### Protected vs. Unprotected Routes

| Route | Auth Required |
|-------|---------------|
| `GET /api/health` | No |
| `GET /api/debug/auth-check` | No |
| `GET /api/shower-proofs/current` | **Yes** |
| `GET /api/shower-proofs/:id` | **Yes** |
| `GET /api/shower-proofs` | **Yes** |
| `POST /api/shower-proofs` | **Yes** |
| `POST /api/dispatcher/chat` | **Yes** |
| `POST /api/dispatcher/tts` | **Yes** |
| `POST /api/import/ocr` | **Yes** |

---

## Worker Authentication

The Cloudflare Worker (`worker/index.ts`) does **not** enforce JWT authentication at the middleware level. All routes are publicly accessible. Authentication is expected to be handled at the application level (e.g., the frontend only calls authenticated routes when a valid session exists).

This means the Worker endpoints are technically callable without a token. The client-side `authFetchJson` wrapper still injects tokens, but the Worker does not verify them.

---

## Legacy vs. Current Auth Approaches

| Aspect | Legacy | Current |
|--------|--------|---------|
| **Auth Provider** | Custom / none | Supabase JWT |
| **Token Delivery** | Query params, headers | `Authorization: Bearer` header |
| **Backend Validation** | None (Worker) | `requireAuth` middleware (Express) |
| **Token Refresh** | Manual / none | Automatic 401 retry with `refreshSession()` |
| **Frontend Wrapper** | Direct `fetch` | `authFetch` / `authFetchJson` |
| **Error Handling** | Manual | Centralized in `apiClient.ts` |

The legacy Worker endpoints (e.g., `GET /api/shower-proof?cycleKey=`) have no auth. They were replaced by the authenticated `/api/shower-proofs/*` routes on the Express server.
