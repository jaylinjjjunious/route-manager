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

`ProbationCheckInPanel` appears on Today and Jobs. **Check In Now** opens More → Monthly Check-In. **Open Official CE Check-In** opens the official provider directly and records `opened_ce` without marking completion. Provider login/submission happens on the official site; return to attach proof or acknowledge a genuinely completed check-in. Automatic provider recognition remains future work.

Incomplete states use the full coaching panel so the requirement cannot be missed. After completion, the Today/Jobs panel is hidden. More → Monthly Check-In retains the completion status, details, activity log, proof preview, and provider link. The `AIØ17` header remains unchanged.

Phone and tablet users receive the image picker. Computer users additionally receive browser screen capture, which always requires the browser's permission prompt. The app never claims a screenshot exists when capture was canceled or unavailable.

## Verification Levels

- `self_confirmed`: user acknowledgement only; the provider supplied no receipt.
- `screenshot_documented`: a compressed screenshot is stored with the monthly record.
- `provider_verified`: reserved for a future CE confirmation number, message, URL, or API integration.

Future-ready fields are included for provider receipt ID, confirmation URL, and confirmation message ID. The current CE flow exposes no public receipt or API integration, so these fields remain empty.

## Storage And Limits

Monthly records use account-scoped browser caches under `aio_probation_check_ins_v1:<ownerId>`, retaining up to 24 months. The older shared key is retained for explicit ownership-confirmed import. Screenshots reuse the existing proof-image compression routine before storage. Records are an internal discipline/audit log, not independent proof from CE Check-In and not a substitute for instructions from a probation officer.

**Durable Server Storage (2026-10-02)**: Records now sync to Supabase `probation_check_ins` table with row-level security (owner-scoped). The client hook `useProbationCheckIn` exposes `syncToServer()`, `loadFromServer()`, and `syncStatus` for managing synchronization. Local-first behavior is preserved for offline support; server sync runs at startup/focus/online and after local mutations, with explicit retry; merging preserves pending edits.

**Admin Visibility**: Completed check-ins are visible in the Admin Portal at `/admin` → Probation tab. Admin users (server-assigned role in `app_metadata`) can view all users' probation records with filtering by user, month, completion status, and date. Each check-in submission creates an activity log entry in the shared `activity_log` table for audit trail purposes.

## Sync Behavior
- Startup, focus, and online events load account records; mutations trigger debounced save attempts. Retry account sync is available.
- Owner-scoped caches and request/account guards prevent responses from acknowledging another account's edits. Dirty proof/events are merged; completion is retained.
- Failed saves stay pending with a visible error. Records and their activity entries commit in one database transaction; normalized request hashes deduplicate retries.
- Activity actions are check_in_saved, proof_attached, or check_in_completed, with owner/month linkage and minimal metadata. Authenticated clients cannot write directly around server audit.
- Live import, save acknowledgment, reload, Supabase/activity rows, and same-account Edge loading are verified. Screenshot attachment/capture on real devices and in-flight sync race checks remain unverified.
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
## Scope audit — 2026-10-03
Completed and live-verified: in-app reminder navigation; ownership-confirmed account import; save acknowledgment; reload; same-account Edge loading; database/activity persistence; explicitly approved server-controlled Admin role; Admin Overview/Activity/Probation, month filter, details, and More entry after fresh login. Lifeline startup integration and concise resume notes are installed and pushed.
Missing/incomplete: automatic official provider recognition (future implementation); embedded CE login/submission (real blocker); new provider-launch logging wiring; real-device screenshot attachment/capture verification; in-flight save/account-switch and second ordinary-account isolation checks. Proof/manual confirmation UI exists, but its complete real-device flow was not verified. Do not label the entire official check-in workflow finished.
Embedded blocker evidence: the deployed public sign-in HTML has a POST form whose action repeats the proxy prefix. server.ts registers only a GET proxy and rewrites form action URLs twice; provider session cookies are not relayed back to the client. Showing the official sign-in screen therefore does not establish a working submission. No actual provider credentials or check-in submission were used in this audit. Fixing this is a separate next task; no application code was changed during the audit.
Documentation was reconciled where current sections contradicted live results. Older dated review/migration notes are historical and superseded by this audit and the verified production snapshot.
## Official CE launch remediation — 2026-10-03
The broken embedded login is replaced with Open Official CE Check-In on the existing in-app Monthly Check-In page. It uses the tracked launcher to open https://checkin.ce-connect.com directly, recording opened_ce and triggering account sync without marking completion. Return to Route Manager to attach proof and manually confirm a genuinely completed check-in. Provider authentication and submission happen on the provider's own origin, not through Route Manager. The old proxy returns 410 and no longer forwards cookies, rewrites forms, or removes provider framing protections. Automatic provider recognition remains unimplemented; do not confuse direct official-site access with independently verified completion.
Five focused navigation/launch/account tests, type-checking, and the production build pass. The change is prepared for Render automatic deployment; verify production build and signed-in launch/save before calling it live. Actual provider submission cannot be tested without a genuine user check-in; do not create a false completion. Real-device proof flow and concurrency/second ordinary-account isolation checks remain follow-up coverage.

## 404 Fix on Sync After External Navigation — 2026-10-03
**Problem:** After clicking "Open Official CE Check-In" and returning from the external provider site, the `focus` event triggered `synchronize()` which used relative URL `/api/probation-check-ins`. After external browser navigation, the relative URL resolved incorrectly (hash routing `#checkin` / base URL confusion), causing authenticated sync requests to return 404.

**Fix:** Modified `synchronize()` in `useProbationCheckIn.ts` to construct absolute API URLs using `window.location.origin` (e.g., `https://route-manager-phtj.onrender.com/api/probation-check-ins`). Both GET (list) and POST (save) requests now use absolute URLs.

**Verification:** Local lint/build/495 tests pass. Commit db71f44 deployed; build-info reports db71f44. Unauthenticated `/api/probation-check-ins` → 401 (route mounted). Signed-in sync verification pending user test.

## 2026-10-05 — Diagnostics investigation
Diagnostics consumes the existing app sync state and invokes its retry callback. Pending count, last success/error, GET/POST origin/status/type/auth presence are available. Earlier absolute-URL resolved claims are superseded: the authenticated post-return 404 cause is still unverified.

## 2026-10-05 — Production evidence and acknowledgment
Live Edge verification: launch sync GET/POST both return 200 JSON. Found pendingSync remained true after successful acknowledgment with zero dirty records; update recordsRef synchronously before final pending calculation. No completion was fabricated. iPhone behavior/original 404 cause remain unverified.

## 2026-10-05 — Final release handoff
Acknowledgment fix deployed at d8d8ede; nine focused regression tests and lint/build pass. Public SHA/health confirmed. Final post-fix user-visible save/reload acknowledgment remains unverified due blank Edge pages after deployment; original 404 did not reproduce in the earlier signed-in launch GET/POST checks.

## 2026-10-10 security hardening

Superseding security contracts, limits, data-preservation decisions and release status are recorded in [Security Cloud remediation](../../docs/SECURITY_SCAN_2026_10_10.md). Public proof URLs, unrestricted production workspace bypass, global trip-coordinate cache reuse and unauthenticated legacy Worker APIs described in older sections are superseded by that document.
