# Admin Portal

## Purpose

The Admin Portal is a secure, browser-accessible administration interface for Route Manager. It enables remote review of important application data without requiring the Route Manager mobile/PWA app to be installed. The portal runs on the same backend infrastructure and uses the existing Supabase authentication system with server-enforced role-based authorization.

## Architecture

### Separation of Concerns

- **Feature-specific data** remains in its own tables (e.g., `probation_check_ins`, `shower_proof_records`)
- **Shared activity timeline** in `activity_log` provides a centralized audit trail across features
- **Admin portal** is a separate UI at `/#admin` (or `/admin` route) with its own navigation

### Authorization Model

- **Normal user**: Authenticated via Supabase email/password, can access their own data via `/api/*` endpoints
- **Admin**: Same authentication, but with `app_metadata.role === "admin"` only
- **Server enforcement**: All `/api/admin/*` routes use `requireAdmin` middleware which:
  1. Validates Supabase Bearer token (`requireAuth`)
  2. Checks admin role via Supabase Admin API
  3. Returns 403 `ADMIN_REQUIRED` for non-admin users
- **No client-side trust**: Frontend only shows admin entry point to admin users; server enforces authorization on every request

### Activity Logging

A shared `logActivity()` helper in `server/admin/activityLog.ts` writes to the `activity_log` table using the service role key (bypasses RLS for cross-user visibility). Features call this after successful operations:

```typescript
await logActivity({
  ownerId: userId,
  feature: "probation",
  action: "check_in_completed",
  relatedRecordType: "probation_check_in",
  relatedRecordId: `${userId}:${monthKey}`,
  summary: `Completed probation check-in for ${monthKey}`,
  metadata: { device, verificationLevel, hasProof: !!proofDataUrl },
});
```

Records include: id, owner_id, feature, action, related_record_type, related_record_id, summary, metadata, created_at.

## Routes & Endpoints

| Route | Auth | Description |
|-------|------|-------------|
| `/api/admin/overview` | Admin | Dashboard summary stats |
| `/api/admin/activity` | Admin | Paginated activity log with filters |
| `/api/admin/probation` | Admin | Paginated probation records with filters |

### Filtering Support

**Activity** (`/api/admin/activity`):
- `limit` (default 100, max 500)
- `offset` (default 0)
- `feature` (e.g., "probation", "shower")
- `action` (e.g., "check_in_completed")
- `ownerId` (partial user ID)
- `from` / `to` (ISO date range)

**Probation** (`/api/admin/probation`):
- `limit` (default 50, max 200)
- `offset` (default 0)
- `ownerId` (partial user ID)
- `monthKey` (YYYY-MM)
- `completed` ("true" / "false")
- `from` / `to` (ISO date range on completed_at)

## UI Sections

### Overview (`/admin` → Overview tab)

Shows summary cards:
- Total Activity Log entries
- Total Probation Records
- Completed Probation (current month)
- Pending Probation (current month)

Plus recent activity (10) and recent probation (10) lists.

### Activity (`/admin` → Activity tab)

Full activity log table with:
- Timestamp
- Feature / Action badges
- Owner (truncated user ID)
- Summary text
- Expandable metadata JSON
- Filters panel (feature, action, ownerId, date range)
- Pagination

### Probation (`/admin` → Probation tab)

Probation check-in records table with:
- Month (YYYY-MM)
- User ID (truncated)
- Device (phone/tablet/computer)
- Status badge (Completed / Pending)
- Verification Level badge
- Click to open detail modal with:
  - Full record fields
  - Proof image (if attached)
  - Event log timeline
  - Provider receipt ID / confirmation URL
- Filters panel (ownerId, monthKey, completed, date range)
- Pagination

## Probation Check-In Durable Storage

### Client-Side (`useProbationCheckIn.ts`)

- Primary storage: browser `localStorage` (`aio_probation_check_ins_v1`) for offline support
- Server sync: explicit `syncToServer()` and `loadFromServer()` functions
- Sync metadata: `serverSynced`, `serverUpdatedAt`, `syncStatus` (lastSyncedAt, pendingSync, lastError)
- Automatic sync triggers: after `confirmCompleted`, `openCeCheckIn`
- Non-destructive merge: local unsynced changes preserved during `loadFromServer`

### Server-Side (`probation_check_ins` table)

PostgreSQL table (Supabase) with RLS:
- Primary key: `(owner_id, month_key)`
- Fields: started_at, completed_at, device, verification_level, proof_name, proof_data_url, provider_receipt_id, confirmation_url, confirmation_message_id, events (JSONB), updated_at
- Owner-only policies: SELECT/INSERT/UPDATE where `owner_id = auth.uid()`

### Activity Logging Integration

Each probation check-in submission writes an activity log entry:
- `feature`: "probation"
- `action`: "check_in_completed" or "check_in_started" or "check_in_synced"
- `relatedRecordType`: "probation_check_in"
- `relatedRecordId`: `${owner_id}:${month_key}`
- `metadata`: device, verificationLevel, hasProof, syncedAt (for sync)

## Security Rules

1. **No service role key in browser** — Admin API uses server-side service role for database access
2. **Server-enforced authorization** — Hiding UI buttons is not sufficient; every admin endpoint checks role
3. **No secrets in activity logs** — `metadata` only contains non-sensitive operational data
4. **Audit trail** — Admin access (viewing records) is not logged to avoid noise; future write actions will be
5. **HTTPS only** — Production deployment on Render enforces TLS

## Current Limitations

1. **No offline queue for admin** — Admin portal requires online connection
2. **Single admin role** — No granular permissions (view vs. edit vs. delete)
3. **Probation only** — Only probation check-in is connected to Admin; other features (jobs, inventory, proofs) remain in their own UIs
4. **No real-time updates** — Admin UI uses manual refresh; no WebSocket/SSE for live updates
5. **Activity log not user-facing** — Regular users cannot see their own activity timeline yet

## Future Extension Pattern

To connect a new feature to Admin:

1. Add `activity_log` entries in the feature's server endpoint using `logActivity()`
2. Ensure feature data has durable server storage (Supabase table with RLS)
3. Add admin endpoint in `server/admin/adminRoutes.ts` (or new router) with filtering
4. Add UI section in Admin Portal (`OverviewSection`, `ActivitySection`, `ProbationSection` pattern)
5. Update `admin-portal.md` with new feature details
6. Add tests for admin authorization and data access

## Related Files

- `server/admin/auth.ts` — `requireAdmin`, `requireAuthWithUser`, `isAdmin`
- `server/admin/activityLog.ts` — `logActivity`, `getUserIdFromRequest`
- `server/admin/probationRoutes.ts` — `/api/probation-check-ins` CRUD + sync
- `server/admin/adminRoutes.ts` — `/api/admin/overview`, `/api/admin/activity`, `/api/admin/probation`
- `src/features/admin/AdminPage.tsx` — Main admin UI with tabs
- `src/features/admin/OverviewSection.tsx` — Dashboard summary
- `src/features/admin/ActivitySection.tsx` — Activity log with filters
- `src/features/admin/ProbationSection.tsx` — Probation records with detail modal
- `src/components/aio/MoreScreen.tsx` — Admin entry point (conditional on `isAdmin`)
- `src/auth/AuthProvider.tsx` — `isAdmin` flag in context
- `drizzle/0006_activity_log.sql` — Activity log migration

## Last Updated

2026-10-03 — Production routes mounted (unauthenticated 401 verified); signed-in sync blocked by missing `SUPABASE_SERVICE_ROLE_KEY` in Render dashboard. Admin authorization trusts only `app_metadata`; client-editable metadata denied. Account-scoped automatic loading/saving, visible sync failures/retry, and explicit legacy import connected. Migration 0007 atomically saves records and idempotent activity; stale proof/events merged without erasing completion. Supabase tables and RPC installed; rollback-only reliability tests passed. Local focused tests: 21 passed. Local lint/build/494 tests pass. Production routes mounted (unauthenticated 401 verified); signed-in sync blocked by missing Render env vars (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` — must be set in Render dashboard). Admin activation and signed-in verification pending.

## Remediation status — 2026-10-03
This supersedes the earlier independent review findings for local code. Admin authorization trusts only app_metadata; client-editable metadata is denied. Account-scoped automatic loading/saving, visible sync failures/retry, and explicit legacy import are connected to the app. Migration 0007 atomically saves records and idempotent activity; stale proof/events are merged without erasing completion. Supabase tables and RPC are installed; rollback-only reliability tests passed. Local focused tests: 21 passed. Local lint/build/494 tests pass. Production routes mounted (unauthenticated 401 verified); signed-in sync blocked by missing Render env vars (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` — must be set in Render dashboard). Admin activation and signed-in verification pending.
## Live Render configuration check — 2026-10-03
Render Environment already contains SUPABASE_SERVICE_ROLE_KEY plus VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Server code supports the VITE values as fallbacks; separate URL/anon aliases are not required. No secrets were revealed or changed. Production reports 4c62ec5. Reloading the signed-in production check-in page and retrying sync shows no error; Render logs confirm authenticated GET requests reach the server. Record saving/reload is still unverified because the account cache has no current record and older shared records require ownership confirmation before import. Do not repeat migrations: both tables and the atomic RPC were installed and rollback-tested previously. Missing environment settings were a hypothesis, not a proven explanation of the earlier 404. Next confirm ownership of older browser check-ins, import only the user's own records, and verify account acknowledgment, reload, and matching database/activity rows. Admin assignment and cross-browser testing remain separate.
## Admin activation and screens verified — 2026-10-03
After explicit action-time user confirmation, assigned server-controlled Admin to the signed-in account by merging app metadata; other metadata and credentials were preserved. Production Overview shows two records/two activity entries, Activity lists both, and Probation correctly separates completed September from pending October. Month filtering and record detail/event log were verified. Before activation the ordinary account received Admin access required. Fresh-login More discoverability and cross-browser account loading still require the user to sign in to the prepared Edge tab; browser input control detached repeatedly, so credentials were not entered. Do not claim these remaining checks are done.
## Fresh login and cross-browser verification complete — 2026-10-03
The user signed into the deployed app in Edge. A newly opened production tab loaded the same account's saved October start event and timestamp without local legacy import, confirming second-browser loading. More showed the actual authenticated account and Admin Portal entry; opening that entry loaded Overview with the expected two records/two activity entries. This closes the fresh-login discoverability and cross-browser loading blockers. The local development tab was a separate app; no credentials were read, reset, or copied. Browser input sometimes reported detached after a successful SPA navigation, so resulting DOM state was checked before any retry. Remaining follow-up coverage: in-flight save/account-switch races and a second ordinary-account isolation exercise. Do not confuse these with the now-verified main flow.
## Scope audit — 2026-10-03
Completed and live-verified: in-app reminder navigation; ownership-confirmed account import; save acknowledgment; reload; same-account Edge loading; database/activity persistence; explicitly approved server-controlled Admin role; Admin Overview/Activity/Probation, month filter, details, and More entry after fresh login. Lifeline startup integration and concise resume notes are installed and pushed.
Missing/incomplete: automatic official provider recognition (future implementation); embedded CE login/submission (real blocker); new provider-launch logging wiring; real-device screenshot attachment/capture verification; in-flight save/account-switch and second ordinary-account isolation checks. Proof/manual confirmation UI exists, but its complete real-device flow was not verified. Do not label the entire official check-in workflow finished.
Embedded blocker evidence: the deployed public sign-in HTML has a POST form whose action repeats the proxy prefix. server.ts registers only a GET proxy and rewrites form action URLs twice; provider session cookies are not relayed back to the client. Showing the official sign-in screen therefore does not establish a working submission. No actual provider credentials or check-in submission were used in this audit. Fixing this is a separate next task; no application code was changed during the audit.
Documentation was reconciled where current sections contradicted live results. Older dated review/migration notes are historical and superseded by this audit and the verified production snapshot.
