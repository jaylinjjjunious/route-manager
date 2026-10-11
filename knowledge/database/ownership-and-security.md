# Data Ownership & Security

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `worker/index.ts`, `server.ts`, `src/services/apiClient.ts`

---

## Inventory Account Ownership — 2026-10-10

Inventory now uses verified Supabase owner identity in Express and owner/domain/job keys locally and in PostgreSQL. expectedOwnerId and browser lifetime generations reject stale-account work. Unowned v1/v2 browser records are preserved and require an explicit per-job import before upload. The older single-user/browser ownership statements below describe legacy behavior and do not imply old inventory was already attributed.

## Single-User Architecture

The All in One 667 remains a single-user application, but inventory custody now has two explicit company domains inside that account. This is domain isolation, not multi-user authentication.

- One user account manages all routes, jobs, and shower proofs.
- There is no concept of "organizations" or "teams."
- Existing jobs default to the merchandising / secret-shopping inventory domain. Contract-parts inventory requires explicit `inventoryDomain: "contract_parts"` metadata.
- Inventory ledger, evidence references, catalog matching, return details, and offline queues are namespaced by domain in local storage.
- All data belongs to the authenticated Supabase user.

---

## Supabase Auth for User Identification

Authentication is handled by **Supabase Auth**:

- The user signs in via Supabase (email/password, magic link, or social provider).
- The session provides a JWT containing the user's `sub` (user ID).
- The Express server validates this JWT via `requireAuth` middleware.
- Legacy Worker data APIs are retired with HTTP 410 before handler/database access.

**Implication:** Express enforces account ownership; unattributed Worker data cannot be reassigned without an owner-confirmed migration.

---

## Client-Side Data Storage

Some data is stored locally in the browser:

- **localStorage** — app preferences, UI state, cached data
- **IndexedDB / local files** — may be used for offline photo storage

This data is device-specific and does not sync across devices.

---

## Backend Data Ownership

BlueAI exception (2026-09-27): the dedicated machine token maps to one
server-configured Supabase owner UUID; request bodies cannot override it.
Authenticated feeds only return that user's records. Browser merging also
checks the owner. This does not migrate other legacy data namespaces.

### Express Backend (Render)

- Proof metadata shares a bounded local index, but reads and private image requests require matching authenticated owner IDs. New writes never evict another account.
- Local disk remains deployment-dependent; durable object storage is still future work.

### Cloudflare Worker (D1)

- The `shower_proof_records` table has **no `user_id` column**.
- Historical rows are unowned; legacy APIs are retired in source and these rows remain preserved. The old deployment is unverified.
- The `habit_state` table is keyed by a string key, not a user ID.
- The `shower_proofs` (legacy) table similarly has no user isolation.

---

## Security Considerations

### Current Limitations

| Concern | Status | Risk |
|---------|--------|------|
| Multi-user data isolation | Server proof/Supabase and scan/conversation ownership enforced | Remaining legacy browser namespaces require migration |
| Worker legacy APIs | Retired with HTTP 410 in source | Old Sites publication remains unverified |
| Image storage in D1 | Base64 data URLs in TEXT columns | Low — D1 has size limits; large images could exceed them |
| Local file storage (Express) | No encryption | Low — server is trusted |
| JWT validation | Express server enforces authentication | Retired Worker data APIs do not process requests |
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
Cloudflare Worker legacy data APIs → HTTP 410 (D1 preserved)
```

The Worker acts as a separate data store. Currently both backends may hold overlapping proof data, but they are not synchronized.

## 2026-10-10 security hardening

Superseding security contracts, limits, data-preservation decisions and release status are recorded in [Security Cloud remediation](../../docs/SECURITY_SCAN_2026_10_10.md). Public proof URLs, unrestricted production workspace bypass, global trip-coordinate cache reuse and unauthenticated legacy Worker APIs described in older sections are superseded by that document.
