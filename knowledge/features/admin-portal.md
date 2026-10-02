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
- **Admin**: Same authentication, but with `app_metadata.role === "admin"` or `user_metadata.role === "admin"`
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

2026-10-02 — Initial Admin Portal implementation with probation check-in integration