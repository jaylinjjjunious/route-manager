# Route Manager — App Lifeline

This is Route Manager's durable project story: how the app works now, how it got here, and why meaningful decisions were made. Keep it useful across fresh Codex sessions without carrying the entire chat history forward.

Place this file in the Route Manager project beside `AGENTS.md` and the existing knowledge/memory Markdown files. It complements those files; it does not replace them.

## Instructions for Codex

### Lightweight work and usage limits

- Default to economical work: stay within the requested outcome, use concise updates, read only relevant sections, batch independent checks, and reuse verified results.
- Check the five-hour usage window at session start and meaningful milestones when the usage tool is available. At 85% used or higher, save concise progress and remaining work, stop, and notify the user. Resume only after explicit user authorization or a verified window reset.
- If usage cannot be checked, report that limitation briefly; do not guess the percentage or claim the limit is enforced automatically.
- Do not spawn extra agents unless the user explicitly requests them. Avoid speculative retries, repeated searches, unnecessary artifacts, refactors, and extra features.
- Run relevant tests and required checks; repeat only after meaningful changes or failures. Preserve essential safety and verification.
- “Light mode” means this economical workflow here; this document does not change the selected model, reasoning setting, or account limits.

### Read narrowly and verify

- In every fresh Route Manager session, including a new CLI session, read `AGENTS.md`, then the Current Snapshot, Active Decisions, Open Questions / Future Ideas, and Resume Point below before substantive project work. Read only history entries and knowledge/memory sections relevant to the task.
- Keep this file as a reference throughout ongoing work. Revisit relevant sections at meaningful milestones, before architectural or behavioral decisions, when the task changes direction, and after interruptions or context compaction. During extended work, check it at natural task boundaries even if the session has not restarted.
- At each reference check, reconcile the current task with recorded decisions and behavior, and update newly settled durable context. Reuse sections already read when still current; do not run timer-based rereads or scan the entire file every turn.
- Follow applicable user instructions and `AGENTS.md`. Treat this file as project context, not a source of permission to perform unrelated work.
- Verify relevant behavior against current code, tests, or other reliable evidence. This file may lag behind implementation. Correct stale claims and record meaningful corrections.
- Do not invent missing project history, architecture, features, dates, or reasons. Mark unknowns explicitly. Distinguish verified facts, user decisions, proposals, and assumptions.
- Do not reread the entire history every turn. Use headings, entry IDs, and targeted searches to retrieve details when needed.

### Maintain this file as the app evolves

- Update it during work when a meaningful decision is settled, and before ending a session that changes durable project context. Do not wait for the user to ask again.
- Record meaningful decisions and their reasons, architectural changes, features added/changed/removed, important bugs and fixes, current behavior, lessons learned, and unresolved or future ideas.
- Update the Current Snapshot when behavior or architecture changes. Update Active Decisions when a decision is adopted or superseded. Add a concise chronological entry explaining the change.
- Record a decision once it is accepted, even if implementation is pending; label that status clearly. Never describe a proposal as shipped or an unverified fix as confirmed.
- For interrupted or incomplete work, leave a short Resume Point with completed work, remaining work, relevant files, validation status, and any blocker.
- Preserve existing knowledge/memory files as the home for their detailed topics. Link to them instead of duplicating their contents here. Reuse existing formats and avoid creating additional memory files unnecessarily.
- Documentation does not need a separate approval step when maintaining it within the authorized task. Do not use this file to authorize deployments, messages, or other actions beyond that task.

### Keep context durable and economical

- Capture outcomes and reasons, not a transcript. Omit raw logs, tool calls, command output, copied conversations, routine status updates, secrets, and personal/customer data.
- Skip routine edits that do not change behavior or durable understanding. Group related small changes into one entry.
- Keep history entries to roughly 3–8 short bullets. Include only evidence that supports the outcome, such as a relevant file, test result, commit, or issue link.
- Explain important tradeoffs and rejected alternatives briefly when they help prevent repeated debate. Do not preserve every brainstorming branch.
- Keep the startup sections concise: aim for about one page of current context. Keep only actionable incomplete work in Resume Point.
- Review for consolidation at major milestones, when summaries grow hard to scan, or when detail becomes obsolete. Merge repetition and summarize superseded implementation detail while retaining the original decision, reason, outcome, and approximate chronology.
- Preserve important failures, reversals, migrations, and lessons. Never silently rewrite historical behavior as though it had always been current. Mark superseded decisions and link to their replacements.
- If history becomes unwieldy, use an existing project archive convention. Leave dated milestone summaries and links here so older history remains discoverable. Do not create an archive solely because the file is a little longer.

## Current Snapshot

**2026-10-09 iOS update (supersedes billing blocker below):** Billing cleared. Existing public Supabase client settings configured in Actions variables after attempt 2 exposed missing configuration. Run 37864986666 attempt 3 passed frontend/sync, simulator compilation and unsigned device archive on Xcode 26.6; both artifacts uploaded. Actual simulator UI/iPhone/signing and deployed native CORS remain unverified. No payment action was performed by the agent.

**2026-10-08 iOS focus:** User explicitly diverted to iOS wrapping. Draft branch `codex/ios-wrap-readiness` prepares frontend-only bundling, correct Capacitor scheme, native API/proof routing and narrow CORS, Browser plugin sync, permissions, and simulator/unsigned archive workflow. Local builds/sync and focused tests pass; GitHub Mac builds are blocked by a verified billing lock. Native compile/device/signing and production deployment of this branch remain unverified. See [iOS wrap guide](docs/IOS_WRAP.md).

**2026-10-08 header detail:** User requested a small green `10/12` immediately beside the 7 in AIØ17. Implemented as a fixed 11px marker in `AioHeader`; lint/build and 11 existing header tests pass. Deployed f561889 and personally verified the visible green marker in the signed-in public app.

**2026-10-05 current:** Diagnostics deployed and signed-in More/API/Sync/Auth/System/Copy verified at 96a3170. Official launch sync GET/POST returned authenticated 200 JSON, without false completion. Separate stale pending acknowledgment fixed, regression/lint/build passed, pushed and deployed at d8d8edecc2ed77c072e28fe0ce4d9d618cd340e9; public build-info and health verified. Final post-fix UI/reload validation is blocked: existing and fresh Edge tabs expose blank app pages after deployment. Original 404 did not reproduce in Edge; iPhone/native behavior remains unverified. BlueAI paused; iOS wrap follows existing CE proof/race/isolation work.

**Verified production progress (2026-10-03):** Signed-in import, account acknowledgment, reload, and matching Supabase/activity records are verified. Required Render configuration was already present; no secrets were changed. User explicitly approved a server-controlled Admin role for the signed-in account. Admin Overview, Activity, Probation, month filter, and record details now work. Fresh-login More entry, opening Admin from that entry, and same-account loading in Edge are verified.

Last reviewed: 2026-10-03 — Admin Portal and durable probation storage implemented; production routes mounted but signed-in sync blocked by missing server env var.

- **Purpose and users:** Route Manager is a gig-worker route optimization app (All in One 667 / AIØ17) with daily scheduling, job tracking, battery management, habit tracking, and probation check-in coaching. The Admin Portal adds a secure, browser-accessible remote administration interface for reviewing probation check-ins and activity logs without installing the app.
- **Current capabilities and workflows:** Three-tab AIØ navigation (Today / Jobs / More). Probation check-in with monthly cycle (days 1–10), job lock on day 8+, account-scoped local storage with automatic server sync. Admin Portal at `/admin` with Overview, Activity, Probation sections. Server-enforced admin authorization via Supabase role metadata.
- **Architecture and data flow:** React + Vite frontend, Express server on Render. Supabase Auth for authentication. PostgreSQL (Supabase) for durable data: `probation_check_ins` (owner-scoped, RLS), `activity_log` (shared timeline, service-role access). Feature-specific tables remain separate; `activity_log` provides shared admin timeline.
- **Data storage and external integrations:** Supabase Auth + Database. Google Gemini for AI features. Open-Meteo for weather. Official Transit API (proxied). All secrets server-side.
- **Important behavior, constraints, and invariants:** Admin access requires `app_metadata.role === "admin"` only. Non-admin users get 403 on `/api/admin/*`. Probation check-ins sync to durable storage; local-first offline support preserved. Activity logging uses service role for cross-user visibility.
- **Official check-in remediation:** Local code opens the official site directly from the in-app page and records the launch; the broken proxy is retired. Final build/deployment checks pending. Automatic provider recognition and real-device/race/isolation checks remain open.
- **Known limitations and significant unresolved bugs:** Admin portal requires online connection (no offline queue). Only probation connected to Admin; jobs/inventory/proofs remain separate. No granular admin permissions. Activity log not user-facing. BlueAI paused.
- **Implementation / release status:** Runtime remediation is deployed; tables/RPC are installed. Local lint/build and focused tests passed. Live saving/reload and Admin server screens are verified; fresh-login discoverability and a second browser are verified.

## Context Map

Use repository-relative links after confirming actual filenames.

| Context | Where it belongs |
| --- | --- |
| Working rules and user preferences | Existing `AGENTS.md` |
| Current behavior and project evolution | This file |
| Detailed architecture, domain rules, setup, and topic memory | Existing knowledge/memory files; add verified links here |
| Implementation and validation evidence | Relevant code, tests, commits, and issues |

Verified project references: [knowledge map](knowledge/README.md), [current state](knowledge/memory/current-state.md), [known bugs](knowledge/memory/known-bugs.md), [priorities](knowledge/memory/current-priorities.md), [lessons](knowledge/memory/lessons-learned.md), and [decision index](knowledge/decisions/README.md). These paths resolve from the installed project copy.

Required installation step for reliable startup discovery: add this reference to the existing project `AGENTS.md`, preserving its other instructions. For other CLI tools, link the same file from that tool's supported project instruction file. The lifeline cannot make a tool discover itself merely by existing; integration into each tool's startup instructions is necessary.

> In every Route Manager session, read the startup sections of `APP_LIFELINE.md` before substantive work. Reference its relevant sections periodically during ongoing work, at milestones, before important decisions, and after interruptions or context compaction. Keep its snapshot, decisions, history, and resume notes current as meaningful project changes occur; reuse unchanged context instead of rereading the entire history.

## Active Decisions

### D-001 — Admin Portal Architecture

- **Date / status:** 2026-10-02 — accepted, implemented locally.
- **Decision and scope:** Build a separate `/admin` web interface with server-enforced role authorization. Feature-specific data stays in its own tables; shared `activity_log` provides cross-feature timeline. Probation is the first Admin-connected feature.
- **Reason / tradeoff:** Remote browser access required for admin review without app install. Centralized activity log avoids duplicating logging per feature. Server enforcement prevents UI-only security. Blueprint: Route Manager and Route Manager Admin are two interfaces over the same backend.
- **Consequences:** New migration `drizzle/0006_activity_log.sql`. New server modules in `server/admin/`. New UI in `src/features/admin/`. Admin role stored in server-controlled Supabase `app_metadata`. BlueAI remains paused.
- **Evidence / history:** H-005, H-006.
- **Supersedes / superseded by:** Supersedes earlier local-only probation storage approach (H-004).

### D-002 — Probation Durable Server Storage

- **Date / status:** 2026-10-02 — accepted, implemented locally.
- **Decision and scope:** Probation check-ins sync to Supabase `probation_check_ins` table (owner-scoped, RLS). Local `localStorage` remains primary for offline; automatic startup/focus/online loading and mutation saving, with retry controls and non-destructive merge.
- **Reason / tradeoff:** Remote admin review requires durable cloud storage. Local-first preserves offline workflow. Explicit sync avoids silent failures. Migration endpoint supports legacy localStorage import.
- **Consequences:** New API endpoints `/api/probation-check-ins*`. Client hook exposes `syncStatus`, `syncToServer`, `loadFromServer`. Activity logging integrated.
- **Evidence / history:** H-005.
- **Supersedes / superseded by:** Supersedes browser-only storage (H-004).

## Chronological History

Keep entries in ascending date order. Assign stable IDs such as H-001 so summaries and decisions can reference them. For imported history with an unknown date, say “date unknown; imported YYYY-MM-DD” instead of guessing.

### 2026-10-02 · H-001 — Lifeline document created

- **Type / status:** Project documentation — created; repository installation pending.
- **Context:** The user requested durable project memory so future sessions can understand Route Manager without relying on a growing chat history.
- **Outcome:** Established a compact current snapshot, decision record, chronological history, and resume format alongside existing project instructions and memory.
- **Reason:** Preserve meaningful decisions and the app's evolution while avoiding transcripts, repeated context, and unnecessary reading.
- **Verification:** No Route Manager source or existing project memory was available in this workspace. App-specific facts remain unknown.

### 2026-10-02 · H-002 — Continuous reference requirement added

- **Type / status:** Project workflow decision — accepted; project integration pending.
- **Decision:** Fresh sessions and ongoing work should reference the lifeline, including new CLI sessions and natural work milestones.
- **Reason:** Preserve continuity throughout work, not only when a session starts, while keeping reading economical.
- **Follow-up:** Add the lifeline reference to the project's existing startup instructions; configure equivalent references for other CLI tools as applicable.

### 2026-10-02 · H-003 — Project startup reference installed

- **Type / status:** Project documentation — installed locally.
- **Change:** Added the lifeline beside the app's existing `AGENTS.md`, added its startup and periodic-reference rule there, and linked it from the knowledge map.
- **Evidence:** Existing project instructions and knowledge paths were inspected. App behavior has not been audited or reconstructed.
- **Limit:** Local integration is complete for this checkout. Other tools must honor `AGENTS.md` or have equivalent startup references; other checkouts require the documentation changes to be synchronized.

Use this format for subsequent entries:

### YYYY-MM-DD · H-NNN — [Meaningful milestone]

- **Type / status:** Decision, architecture, feature, bug/fix, removal, or lesson; proposed, accepted, implemented, verified, or released.
- **Problem / trigger:** What made this work necessary.
- **Change / behavior:** Before and after; include impact on users or the system.
- **Reason / lesson:** Why this approach was chosen; what future work should remember.
- **Evidence / validation:** Relevant links, checks and results, or “not verified.”
- **Follow-up:** Only unresolved work; reference its entry below.

## Open Questions / Future Ideas

- **Q-iOS-001 — resolved 2026-10-09:** Billing cleared; public Supabase build settings configured; Mac simulator/device compilation and artifact uploads pass.
- **Q-iOS-002 — unverified:** Apple developer team/signing and App Store Connect app. Verify when preparing a signed device build.

No app-specific items have been verified yet. A future idea is not authorization to implement it.

For each item, use a stable ID such as Q-001 and record: the question or idea, its reason, status (idea / needs decision / planned / blocked), and the next useful step. Add relevant evidence and dependencies only if known. When resolved, remove it from this active list and retain the outcome in history or Active Decisions.

### 2026-10-02 · H-005 — Admin Portal foundation + Probation durable storage

- **Type / status:** Architecture, feature — accepted, implemented locally; lint/build/tests pass.
- **Problem / trigger:** Need remote Admin access to probation records without app install; probation was browser-local only.
- **Change / behavior:** Added `/admin` UI (Overview, Activity, Probation tabs) with server-enforced admin role. Created `activity_log` table for shared timeline. Probation check-ins now sync to Supabase `probation_check_ins` (RLS) with explicit client sync. Admin authorization via `requireAdmin` middleware checking `app_metadata.role === "admin"`.
- **Reason / lesson:** Centralized activity log avoids per-feature logging duplication. Server enforcement > UI hiding. Local-first preserved for offline. BlueAI paused per user instruction.
- **Evidence / validation:** `npm run lint`, `npm run build`, 484 tests pass. Migration `drizzle/0006_activity_log.sql` created. Server modules: `server/admin/{auth,activityLog,probationRoutes,adminRoutes}.ts`. UI: `src/features/admin/{AdminPage,OverviewSection,ActivitySection,ProbationSection}.tsx`.
- **Follow-up:** Apply migration to Supabase. Verify production deployment. Connect next feature (jobs or inventory) to Admin.

### 2026-10-02 · H-006 — Admin UI entry point in More screen

- **Type / status:** Feature — accepted, implemented locally.
- **Problem / trigger:** Admin users need discoverable access to `/admin` from the app.
- **Change / behavior:** Added "Admin Portal" button to More → account section, conditional on `isAdmin` from AuthContext. Uses existing `ToolPageHeader` pattern.
- **Reason / lesson:** Separate admin UI from worker UI. Conditional render avoids clutter.
- **Evidence / validation:** `MoreScreen.tsx` updated with `isAdmin`, `onNavigateAdmin` props. `AuthProvider` exposes `isAdmin` from user metadata.
- **Follow-up:** None.

### 2026-10-02 · H-007 — Independent Admin / probation verification

- **Result:** Not ready to move on. Review of commit `45bd90612151c3060981febac72f2187de944b14` confirmed code deployment and `/api/health` OK; unauthenticated admin and probation requests return 401.
- **Signed-in behavior:** More has no Admin entry for the current account. Direct `#admin` loads the UI but shows “Admin access required.” No admin privileges were granted and no check-in was marked complete.
- **Database evidence:** Read-only Supabase REST checks for `activity_log` and `probation_check_ins` each returned 404 / PGRST205 (table not found in schema cache). A dashboard SQL check could not be executed because browser commands timed out; physical table existence and role counts remain unconfirmed.
- **Code blockers:** Server and frontend trust user-editable metadata for admin status; save/load functions have no consumer calls; browser caches lack account namespaces; server data can overwrite unsynced local fields/events during loading; activity failures are ignored and retries create duplicate log entries. Client-supplied provider verification is accepted without independent receipt validation.
- **Checks:** Production build and 11 focused probation policy/navigation/panel tests passed. These tests do not exercise new admin authorization, durable save/load, or activity logging. Type-checking was started; result not yet collected.
- **Next:** Fix authorization and add regression coverage before granting admin access. Confirm/apply required schemas, connect owner-isolated synchronization with non-destructive merging and visible failure states, make activity logging reliable and retry-safe, then verify signed-in save/reload and a second browser. This was verification only; no application or database configuration changes were made.

### H-008 — Remediate independently verified Admin/probation blockers
- Admin authorization now accepts only server-controlled app metadata; four denial/failure regression tests pass.
- Added account-scoped browser caches, startup/focus/online loading, automatic save attempts, visible pending/error/retry states, and explicit legacy import without silently assigning shared browser data.
- Added validated server requests and migration 0007: monthly records and idempotent activity logs commit together; stale device updates retain completion, proof, and merged events. Client writes bypassing audit are denied; provider verification cannot be asserted by clients.
- Applied required tables and atomic function to Supabase. Rollback-only SQL checks passed for retries, stale updates, and write restrictions; no fake completion remained.
- Local focused tests: 21 passed. Final lint/build and diff checks passed. Commit 253fe63e6065b44ad3ce8d922bd4e96a91cda4d0 is pushed to github/main; Production now reports this commit and health passes; signed-in flow and Admin verification remain pending. No server-assigned admin account exists.

### 2026-10-03 · H-009 — Production 404 on authenticated probation sync
- **Type / status:** Bug fix — identified, fix deployed; Render dashboard config pending.
- **Problem / trigger:** Signed-in users on More → Monthly Check-In see "Account sync failed: Request failed with 404" when attempting account sync. Unauthenticated requests to `/api/probation-check-ins` correctly return 401; authenticated requests return 404 instead of 503.
- **Change / behavior:** Render dashboard missing `SUPABASE_SERVICE_ROLE_KEY` (and `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Without service role key, `database` client in `server/admin/probationRoutes.ts` is null; middleware should return 503 but authenticated requests return 404, suggesting route match issue under auth. Added missing env vars to `render.yaml` (sync: false) in commit c5f9f9e.
- **Reason / lesson:** `render.yaml` declares server env vars with `sync: false` (manual dashboard entry required). Missing service role key makes `database` null in `probationRoutes.ts`; middleware returns 503 but authenticated requests hit 404 — likely route match issue under auth when DB client is null. Env vars must be set in Render dashboard manually.
- **Evidence / validation:** Unauthenticated `/api/probation-check-ins` → 401 (route mounted). Commit c5f9f9e deployed; build-info reports c5f9f9e. Render dashboard env vars still need manual entry.
- **Follow-up:** Set `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` in Render dashboard → Environment; redeploy; verify authenticated sync returns 200/503 not 404.

### 2026-10-03 · H-010 — Fix 404 on probation sync after external CE launch
- **Type / status:** Bug fix — implemented, tested, deployed.
- **Problem / trigger:** After clicking "Open Official CE Check-In" and returning from the external provider site, the `focus` event triggered `synchronize()` which used relative URL `/api/probation-check-ins`. After external browser navigation, the relative URL resolved incorrectly (hash routing `#checkin` / base URL confusion), causing authenticated sync requests to return 404.
- **Change / behavior:** Modified `synchronize()` in `useProbationCheckIn.ts` to construct absolute API URLs using `window.location.origin` (e.g., `https://route-manager-phtj.onrender.com/api/probation-check-ins`). Both GET (list) and POST (save) requests now use absolute URLs.
- **Reason / lesson:** Relative URLs can resolve incorrectly after external browser navigation due to hash routing (`#checkin`) or base URL confusion. Always use absolute URLs for API calls triggered by external navigation return.
- **Evidence / validation:** Local lint/build/495 tests pass. Commit db71f44 deployed; build-info reports db71f44. Unauthenticated `/api/probation-check-ins` → 401 (route mounted).
- **Follow-up:** Verify signed-in sync works end-to-end after returning from official CE Check-In site.

## Resume Point
**2026-10-09 superseding handoff:** Billing cleared, Actions public client config installed, run 37864986666 attempt 3 native builds/artifact uploads pass. Obtain the simulator app and unsigned archive from the run. Next: actual simulator interaction, production native CORS deployment after review, Apple team/signing, and real-iPhone validation. No payment was submitted by the agent. Source implementation is 606abd1 in draft PR #9; UI/device/signing remain unverified.
**Pushed iOS handoff:** Implementation `606abd1` is remote-verified in [draft PR #9](https://github.com/jaylinjjjunious/route-manager/pull/9). Its Mac run 37864986666 failed before starting: account locked for billing. No native artifact produced. Working tree clean after handoff documentation commit; resume from this branch, not older main notes.
**Superseding handoff (2026-10-08):** Continue the user's iOS diversion on `codex/ios-wrap-readiness`. See [iOS wrap guide](docs/IOS_WRAP.md) for changes, validation and billing evidence. Resolve Actions billing or use a Mac with Xcode 26+, compile/test the simulator, deploy native CORS after review, then sign and verify on iPhone. Native icon and Apple account/signing setup are unverified. Earlier CE/race/isolation follow-ups remain open; no native readiness or TestFlight claim.
**Superseding handoff (2026-10-05):** Application change d8d8ede is pushed, GitHub main verified, and public build-info/health confirm deployment. Console 96a3170 was fully discoverable and API/Sync/Auth/System/Copy verified signed-in; authenticated launch GET/POST returned 200 JSON. PendingSync acknowledgment bug reproduced and fixed; nine focused tests and lint/build pass after the fix (full 500-test suite passed for Diagnostics). Next: restore responsive production browser access, verify final pending=false/Saved to your account after a genuine launch/save/reload, then real-iPhone proof flow. Existing/fresh Edge app pages were blank on final post-deployment check; do not claim the final acknowledgment UI or iPhone verified. No further speculative 404 change. Continue afterward with races/account switches, ordinary-account isolation, recognition brainstorming, then iOS wrap.

- **Active task (2026-10-03):** Fix 404 on probation sync after external CE launch — **FIXED and DEPLOYED** (commit db71f44). Relative URL resolution after external browser navigation fixed by using absolute API URLs in `synchronize()`.
- **Completed:** 
  - Official CE launch button works, opens `https://checkin.ce-connect.com` directly
  - `opened_ce` event recorded locally and synced to server
  - Relative URL 404 fixed by using absolute API URLs (`window.location.origin`)
  - Admin Portal and durable probation storage verified in production
  - Admin activation and screens verified
  - Fresh login and cross-browser loading verified
- **Blockers:** None for this fix. Signed-in end-to-end verification of the fix pending user test.
- **Validation status:** Local lint/build/495 tests pass. Production routes mounted (unauthenticated 401 verified). Commit db71f44 deployed.
- **Next step:** User to test signed-in flow: More → Monthly Check-In → Open Official CE Check-In → return → verify no 404 error, account sync succeeds, `opened_ce` event persists after reload, Admin shows new event.

## Last Updated
2026-10-03 — Fix 404 on probation sync after external CE launch deployed (commit db71f44). Official CE launch flow verified end-to-end pending signed-in test.

## Next CLI: Signed-In Saving Verification

Documentation handoff only; do not build new features. The remediation is pushed and deployed at commit c5f9f9e. Production health passed. Routes mounted but signed-in sync blocked by missing Render dashboard env vars. Local lint/build/494 tests pass; rollback-only database reliability checks passed. The live signed-in flow remains unverified.

1. Read AGENTS.md and this lifeline's startup sections; check usage and Git status. Preserve existing changes. Reuse the deployed work instead of repeating migrations or implementation.
2. Render configuration is already present and saving is verified; do not change secrets or redeploy for this old hypothesis. Proceed to a fresh login in the second browser.
3. Open https://route-manager-phtj.onrender.com and sign in to the intended Route Manager account. Confirm its actual identity; the app header may contain a hardcoded unrelated email. Do not confuse the Supabase dashboard account with the app account.
4. Open More → Monthly Check-In. Confirm Today/Jobs Check In Now reaches that page too. Read the account-sync status. If it shows an error, inspect the authenticated API response and Render storage configuration safely; never expose credentials or forge sessions.
5. Open official CE Check-In from the in-app page to record a harmless start event, then return and wait for Saved to your account. Do not mark completion or upload private proof just to test. Only confirm an actual completed check-in.
6. Reload. Confirm the same start event and timestamp remain and the account-save status is successful. In Supabase, confirm the matching owner/month record and activity event exist. A local/pending save alone is not evidence of account persistence.
7. Sign into the same account in a second browser/device. Open Monthly Check-In and confirm the same month/events load. Do not claim cross-browser verification from a single reload or SQL alone.
7. If older shared browser records exist, use Import my older check-ins only after confirming they belong to this account. Confirm import persists after reload. Preserve the original shared cache; skip this step when none exists.
8. In a controlled test environment, verify failed storage/logging leaves edits pending with a visible error. Retry and confirm activity is not duplicated. Test a new edit during an in-flight save and an account switch during loading/saving; stale responses must not acknowledge newer edits or expose another account's data.
9. Verify an ordinary account is denied Admin access. Authorization must use server-controlled app_metadata only; user_metadata cannot grant access. No server-assigned admin existed at the last database check.
10. Identify the intended Admin account and obtain action-time confirmation before granting its server-controlled Admin role through the dashboard. Browser confirmation policy requires this because it expands access to other users' sensitive records. Preserve existing metadata. Refresh the session afterward. Never change credentials or use user-editable metadata.
11. Confirm Admin Portal appears under More. Verify Overview, Activity, and Probation show the correct account's start event and no false completion. Confirm a different ordinary account remains denied Admin access and sees only its own check-in history. Report any unavailable account/browser check explicitly.
12. Update this lifeline and affected knowledge/memory files with evidence and remaining gaps. Fix only reproduced problems. If code changes, run relevant tests and required lint/build, commit/push, and verify production plus the actual signed-in interaction. Deployment alone is not feature sign-off.

Relevant implementation: src/features/probation/useProbationCheckIn.ts, probationSync.ts, MonthlyCheckInPage.tsx; server/admin/probationRoutes.ts, activityLog.ts; drizzle/0007_probation_atomic_sync.sql.

Remaining: signed-in save/reload, second-browser loading, in-flight sync races, Admin activation/screens, and ordinary-account isolation. Automatic provider completion recognition is future work. The deployment monitor is paused; no background flow verification is running.
2026-10-03 — Production 404 root cause identified (missing Render env vars); render.yaml fix deployed; dashboard config and signed-in verification pending.
## Live Render configuration check — 2026-10-03
Render Environment already contains SUPABASE_SERVICE_ROLE_KEY plus VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Server code supports the VITE values as fallbacks; separate URL/anon aliases are not required. No secrets were revealed or changed. Production reports 4c62ec5. Reloading the signed-in production check-in page and retrying sync shows no error; Render logs confirm authenticated GET requests reach the server. Record saving/reload is still unverified because the account cache has no current record and older shared records require ownership confirmation before import. Do not repeat migrations: both tables and the atomic RPC were installed and rollback-tested previously. Missing environment settings were a hypothesis, not a proven explanation of the earlier 404. Next confirm ownership of older browser check-ins, import only the user's own records, and verify account acknowledgment, reload, and matching database/activity rows. Admin assignment and cross-browser testing remain separate.
## Signed-in saving verified — 2026-10-03
User confirmed ownership of the older browser records and authorized import. The production UI acknowledged Saved to your account; after reload it retained the imported start event and account-save status. Supabase read-only verification found both imported months for the signed-in owner, with one activity entry per month: September has its pre-existing completion, October has a start event and remains incomplete. No fabricated completion or proof was created. This resolves the live single-browser save/reload verification blocker. Cross-browser loading and Admin activation/screens remain unverified. The legacy import prompt reappears after reload because the shared cache is intentionally retained; note for later UI cleanup, not a saving failure. Do not repeat migrations or change Render secrets: the service key was already configured and the VITE URL/anon fallbacks are supported.
## Admin activation and screens verified — 2026-10-03
After explicit action-time user confirmation, assigned server-controlled Admin to the signed-in account by merging app metadata; other metadata and credentials were preserved. Production Overview shows two records/two activity entries, Activity lists both, and Probation correctly separates completed September from pending October. Month filtering and record detail/event log were verified. Before activation the ordinary account received Admin access required. Fresh-login More discoverability and cross-browser account loading still require the user to sign in to the prepared Edge tab; browser input control detached repeatedly, so credentials were not entered. Do not claim these remaining checks are done.
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

## 2026-10-05 · H-011 — Recover and complete the Diagnostics side task
- Recovered the explicit Diagnostics-first plan from the Repo overview check chat; the probation 404 is not proven resolved by absolute URLs.
- Repaired the unfinished console and reused shared app sync state and DebugProvider logs. Added response type/classification, frontend/server identity, safe copying and retry; removed payload console logging.
- Fixed store-issued request IDs and elapsed network-failure time; centralized credential/query/proof redaction. Lint/build and all 500 tests pass.
- Local More entry, API/Sync/System and safe Copy verified; 96a3170 pushed. Public health passes but build-info still reports 487ec6e; Render dashboard did not load, so deployment start/completion is unconfirmed; production Edge currently fails loading its dynamic App bundle. No false provider completion or iPhone verification claimed.

## 2026-10-05 · H-012 — Live diagnostics and stale pending acknowledgment
- Signed-in production More entry, API/Sync/Auth/System, safe Copy, matching frontend/server 96a3170 commits and service-worker state verified. Startup failure cleared after deployment/reload.
- Official provider launch was exercised without submission or false completion. Authenticated GET/POST probation requests returned 200 application/json; no 404 reproduced in Edge.
- Successful save left pendingSync true despite zero pending records. Fixed the stale ref calculation; nine focused regression tests and lint/build pass; live verification pending. iPhone behavior and original 404 cause remain unverified.

Final 2026-10-05 release evidence: d8d8ede pushed and remote verified; public build-info reports exact SHA and health is OK. Nine focused diagnostics/sync tests plus lint/build pass. Final acknowledgment UI/reload verification blocked by blank pages in existing/fresh Edge tabs; earlier signed-in Diagnostics and GET/POST 200 JSON checks remain valid. No provider submission or false completion occurred.

## 2026-10-08 · H-013 — Small green header marker
- User requested a fixed green 10/12 close to the seven in AIØ17. Added an 11px bold marker with a 4px gap and accessible heading label.
- Lint/build and 11 existing header tests pass. Commit f561889 pushed and exact public deployment verified; screenshot confirms the small green marker beside the 7. Existing probation/iPhone follow-ups remain separate.

2026-10-08 — User requested a heavier 10/12 marker. Changed its weight from bold (700) to black (900); lint/build pass. Commit a31e4fc deployed to Render; public build SHA and signed-in header visually verified.

## 2026-10-08 · H-014 — iOS wrap preparation

User diverted to autonomous iOS wrap work. Draft branch `codex/ios-wrap-readiness` corrects scheme, frontend-only packaging, Browser SPM sync/Windows paths, permissions, native API/proof routing and exact-origin CORS, and prepares simulator/unsigned archive workflow. Lint, web/native builds, Capacitor sync and 25 focused tests pass. Local native OPTIONS 204 and unauthenticated GET 401 verified; unrelated origin gets no CORS access. Actions billing lock prevents Mac compilation, so native UI/device/signing and production release remain unverified. Full resume guide: `docs/IOS_WRAP.md`.
