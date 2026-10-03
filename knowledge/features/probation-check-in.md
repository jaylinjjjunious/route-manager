# Monthly Probation Check-In

## Purpose

All In One acts as a discipline coach for the user's required monthly CE Check-In. The official reporting window is the 1st through the 10th. Job actions lock beginning on the 8th when the current month has not been recorded as complete.

## Monthly Policy

| Dates | State | Job access |
|---|---|---|
| 1st–3rd | Early Action | Available |
| 4th–7th | Coach Mode | Available |
| 8th–10th | Urgent Mode | Locked |
| After 10th without completion | Overdue | Locked |
| Completed in current month | Check-In Recorded | Available |

The cycle key is the local calendar month (`YYYY-MM`). Completion immediately unlocks job actions. The next month starts a fresh cycle automatically.

## Workflow

`ProbationCheckInPanel` appears on Today and Jobs. **Check In Now** logs the launch time and opens the official CE Check-In website in a new browser tab. After completing the official flow, the user can attach a screenshot and/or use the one-tap **I Completed It** acknowledgement. The panel records device class, event timestamps, reporting month, proof metadata, and verification level.

Incomplete states use the full coaching panel so the requirement cannot be missed. After completion, the Today/Jobs panel is hidden. More → Monthly Check-In retains the completion status, details, activity log, proof preview, and provider link. The `AIØ17` header remains unchanged.

Phone and tablet users receive the image picker. Computer users additionally receive browser screen capture, which always requires the browser's permission prompt. The app never claims a screenshot exists when capture was canceled or unavailable.

## Verification Levels

- `self_confirmed`: user acknowledgement only; the provider supplied no receipt.
- `screenshot_documented`: a compressed screenshot is stored with the monthly record.
- `provider_verified`: reserved for a future CE confirmation number, message, URL, or API integration.

Future-ready fields are included for provider receipt ID, confirmation URL, and confirmation message ID. The current CE flow exposes no public receipt or API integration, so these fields remain empty.

## Storage And Limits

Monthly records use the existing browser-local `safeStorage` pattern under `aio_probation_check_ins_v1`, retaining up to 24 months. Screenshots reuse the existing proof-image compression routine before storage. Records are an internal discipline/audit log, not independent proof from CE Check-In and not a substitute for instructions from a probation officer.

**Durable Server Storage (2026-10-02)**: Records now sync to Supabase `probation_check_ins` table with row-level security (owner-scoped). The client hook `useProbationCheckIn` exposes `syncToServer()`, `loadFromServer()`, and `syncStatus` for managing synchronization. Local-first behavior is preserved for offline support; server sync is explicit and non-destructive (local unsynced changes are preserved during merge).

**Admin Visibility**: Completed check-ins are visible in the Admin Portal at `/admin` → Probation tab. Admin users (server-assigned role in `app_metadata`) can view all users' probation records with filtering by user, month, completion status, and date. Each check-in submission creates an activity log entry in the shared `activity_log` table for audit trail purposes.

## Sync Behavior

- **Automatic triggers**: `openCeCheckIn` (started) and `confirmCompleted` (completed) set `pendingSync: true`
- **Manual sync**: User can call `syncToServer()` from the Monthly Check-In page
- **Load from server**: `loadFromServer()` merges server records with local (non-destructive)
- **Conflict resolution**: Server wins for synced fields (`startedAt`, `completedAt`, `verificationLevel`, `proofDataUrl`, `events`); local unsynced changes are preserved
- **Offline support**: Local storage remains primary; sync occurs when online
- **Migration**: `syncProbationCheckIns()` bulk endpoint supports migrating existing localStorage records

## Activity Logging

Each probation event creates an entry in the shared `activity_log` table:
- `feature`: "probation"
- `action`: "check_in_started" | "check_in_completed" | "check_in_synced"
- `relatedRecordType`: "probation_check_in"
- `relatedRecordId`: `${ownerId}:${monthKey}`
- `metadata`: device, verificationLevel, hasProof, syncedAt (for sync)

Visible in Admin Portal → Activity tab with filtering.

## Job Enforcement

The probation lock composes with the existing shower gate through the shared `jobAccessReady` boundary in `App.tsx`. While locked, schedule information and job details remain viewable, but navigation, status/lifecycle actions, Ride Mode, adding, optimization, moving, review, and completion are blocked or disabled.

## Source Files

- `src/features/probation/probationPolicy.ts`
- `src/features/probation/useProbationCheckIn.ts`
- `src/features/probation/ProbationCheckInPanel.tsx`
- `src/App.tsx`
- `src/components/aio/TodayScreen.tsx`
- `src/features/jobs/JobsScreen.tsx`

## Update 2026-09-26

More → Monthly Check-In opens MonthlyCheckInPage/MonthlyCheckInSettings. The shared useProbationCheckIn launcher records one launch event and opens the provider once through useExternalBrowser: a new web tab or Capacitor native browser. Launch failures appear as an error. The dedicated page uses the existing monthly state and storage. Native iOS behavior still requires device verification.

## Update 2026-10-02 — In-app navigation (local; verification pending)

The Today/Jobs reminder's **Check In Now** button now navigates to the existing More → Monthly Check-In page rather than launching an external browser. The page's existing embedded provider panel and manual completion/proof controls are preserved. Earlier descriptions of the reminder launching the provider directly are superseded by this local change.

Completion still uses browser-local storage. Account-backed persistence, automatic evidence capture, and automatic success recognition are not implemented by this change. Existing unrelated application edits are present; this change is not yet committed, deployed, or verified in the live app.

Deployment follow-up: navigation-only runtime change was committed and pushed as `a75129462d2bcdfa304404a054d8edab0155e42e`. The embedded-panel changes described above remain local and were excluded from that commit. Production confirmation is pending; the earlier not-committed statement is superseded for navigation only.

Production confirmation: build-info reports that pushed commit, health is OK, and the signed-in Today → Check In Now interaction opens `#checkin` inside the app. Navigation is verified live. Embedded provider flow, account-backed saving, and automatic confirmation are still incomplete.

Local verification: type-checking, production build, and 11 focused probation tests passed. Live interaction remains unverified.

Persistence foundation: `drizzle/0005_probation_check_ins.sql` prepares an account/month-keyed Supabase table with row-level owner isolation and bounded evidence storage. Migration has not been applied or tested against Postgres. Client/API synchronization and safe browser-record migration are not wired yet; current saving behavior remains browser-local.
## Remediation status — 2026-10-03
This supersedes the earlier independent review findings for local code. Admin authorization trusts only app_metadata; client-editable metadata is denied. Account-scoped automatic loading/saving, visible sync failures/retry, and explicit legacy import are connected to the app. Migration 0007 atomically saves records and idempotent activity; stale proof/events are merged without erasing completion. Supabase tables and RPC are installed; rollback-only reliability tests passed. Local focused tests: 21 passed. Local lint/build/494 tests pass. Production routes mounted (unauthenticated 401 verified); signed-in sync blocked by missing Render env vars (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` — must be set in Render dashboard). Admin activation and signed-in verification pending.
## Live Render configuration check — 2026-10-03
Render Environment already contains SUPABASE_SERVICE_ROLE_KEY plus VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Server code supports the VITE values as fallbacks; separate URL/anon aliases are not required. No secrets were revealed or changed. Production reports 4c62ec5. Reloading the signed-in production check-in page and retrying sync shows no error; Render logs confirm authenticated GET requests reach the server. Record saving/reload is still unverified because the account cache has no current record and older shared records require ownership confirmation before import. Do not repeat migrations: both tables and the atomic RPC were installed and rollback-tested previously. Missing environment settings were a hypothesis, not a proven explanation of the earlier 404. Next confirm ownership of older browser check-ins, import only the user's own records, and verify account acknowledgment, reload, and matching database/activity rows. Admin assignment and cross-browser testing remain separate.
## Signed-in saving verified — 2026-10-03
User confirmed ownership of the older browser records and authorized import. The production UI acknowledged Saved to your account; after reload it retained the imported start event and account-save status. Supabase read-only verification found both imported months for the signed-in owner, with one activity entry per month: September has its pre-existing completion, October has a start event and remains incomplete. No fabricated completion or proof was created. This resolves the live single-browser save/reload verification blocker. Cross-browser loading and Admin activation/screens remain unverified. The legacy import prompt reappears after reload because the shared cache is intentionally retained; note for later UI cleanup, not a saving failure. Do not repeat migrations or change Render secrets: the service key was already configured and the VITE URL/anon fallbacks are supported.
## Fresh login and cross-browser verification complete — 2026-10-03
The user signed into the deployed app in Edge. A newly opened production tab loaded the same account's saved October start event and timestamp without local legacy import, confirming second-browser loading. More showed the actual authenticated account and Admin Portal entry; opening that entry loaded Overview with the expected two records/two activity entries. This closes the fresh-login discoverability and cross-browser loading blockers. The local development tab was a separate app; no credentials were read, reset, or copied. Browser input sometimes reported detached after a successful SPA navigation, so resulting DOM state was checked before any retry. Remaining follow-up coverage: in-flight save/account-switch races and a second ordinary-account isolation exercise. Do not confuse these with the now-verified main flow.
