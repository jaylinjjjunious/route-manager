# Data Ownership & Security

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `worker/index.ts`, `server.ts`, `src/services/apiClient.ts`

---

## Single-User Architecture

The Route Manager is designed as a **single-user application**. There is no multi-tenant data isolation in the current implementation.

- One user account manages all routes, jobs, and shower proofs.
- There is no concept of "organizations" or "teams."
- All data belongs to the authenticated Supabase user.

---

## Supabase Auth for User Identification

Authentication is handled by **Supabase Auth**:

- The user signs in via Supabase (email/password, magic link, or social provider).
- The session provides a JWT containing the user's `sub` (user ID).
- The Express server validates this JWT via `requireAuth` middleware.
- The Worker does **not** validate JWTs at the middleware level.

**Implication:** The Express server can identify the user; the Worker cannot.

---

## Client-Side Data Storage

Some data is stored locally in the browser:

- **localStorage** — app preferences, UI state, cached data
- **IndexedDB / local files** — may be used for offline photo storage

This data is device-specific and does not sync across devices.

---

## Backend Data Ownership

### Express Backend (Railway)

- All proof records are stored in a **single local JSON file** and `local-shower-proofs/` directory.
- There is **no per-user data partitioning** — all proofs share one namespace.
- Since the app is single-user, this is acceptable, but it means:
  - If a second user authenticates, they see the same data.
  - Data cannot be separated by user ID without schema changes.

### Cloudflare Worker (D1)

- The `shower_proof_records` table has **no `user_id` column**.
- All users share the same table and can query all records.
- The `habit_state` table is keyed by a string key, not a user ID.
- The `shower_proofs` (legacy) table similarly has no user isolation.

---

## Security Considerations

### Current Limitations

| Concern | Status | Risk |
|---------|--------|------|
| Multi-user data isolation | Not implemented | Low (single-user app) |
| Worker auth enforcement | No middleware auth | Medium — endpoints are publicly callable |
| Image storage in D1 | Base64 data URLs in TEXT columns | Low — D1 has size limits; large images could exceed them |
| Local file storage (Express) | No encryption | Low — server is trusted |
| JWT validation | Express-only | Worker endpoints trust the client |
| CORS | Not explicitly configured | Low — same-origin for Express; Worker may need CORS headers |

### Recommendations

- If the app ever supports multiple users, add `user_id` columns to all D1 tables.
- Add auth middleware to the Worker for production use with multiple users.
- Monitor D1 storage usage — base64 images are large.
- Ensure `.env` files are never committed (secrets like `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`).
- Do not expose the Express server's local filesystem paths in error messages.

---

## Data Flow Summary

```
User → Supabase Auth (JWT)
  ↓
Frontend (authFetchJson injects Bearer token)
  ↓
Express (requireAuth validates JWT) → Local file storage
Cloudflare Worker (no auth check) → D1 database
```

The Worker acts as a separate data store. Currently both backends may hold overlapping proof data, but they are not synchronized.
