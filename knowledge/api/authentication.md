# API Authentication

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

1. `authFetchJson` detects the 401 status.
2. It calls `supabase.auth.refreshSession()` to obtain a new `access_token`.
3. The original request is **retried once** with the refreshed token.
4. If the retry also returns 401, the error is propagated to the caller.
5. The user is redirected to the login screen (or the auth state is cleared).

This retry-once pattern ensures seamless token renewal without interrupting the user experience during normal session expiration.

### Error Extraction

`authFetchJson` automatically parses the JSON response body. If the response contains `{ error: string }`, that error message is extracted and thrown as an `Error`. Non-OK HTTP status codes (other than 401 retry) also throw with the server-provided error message.

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
