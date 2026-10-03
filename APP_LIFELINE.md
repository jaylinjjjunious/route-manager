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

**Remediation in progress (2026-10-02):** Admin trusts only server-controlled app metadata. Owner-isolated automatic sync and atomic retry-safe activity saving are implemented locally. Required tables and the atomic function are applied to Supabase; rollback-only reliability checks passed. Deployment and signed-in end-to-end verification remain pending; no admin accounts are assigned.

Last reviewed: 2026-10-02 — Admin Portal and durable probation storage implemented and verified locally.

- **Purpose and users:** Route Manager is a gig-worker route optimization app (All in One 667 / AIØ17) with daily scheduling, job tracking, battery management, habit tracking, and probation check-in coaching. The Admin Portal adds a secure, browser-accessible remote administration interface for reviewing probation check-ins and activity logs without installing the app.
- **Current capabilities and workflows:** Three-tab AIØ navigation (Today / Jobs / More). Probation check-in with monthly cycle (days 1–10), job lock on day 8+, account-scoped local storage with automatic server sync. Admin Portal at `/admin` with Overview, Activity, Probation sections. Server-enforced admin authorization via Supabase role metadata.
- **Architecture and data flow:** React + Vite frontend, Express server on Render. Supabase Auth for authentication. PostgreSQL (Supabase) for durable data: `probation_check_ins` (owner-scoped, RLS), `activity_log` (shared timeline, service-role access). Feature-specific tables remain separate; `activity_log` provides shared admin timeline.
- **Data storage and external integrations:** Supabase Auth + Database. Google Gemini for AI features. Open-Meteo for weather. Official Transit API (proxied). All secrets server-side.
- **Important behavior, constraints, and invariants:** Admin access requires `app_metadata.role === "admin"` only. Non-admin users get 403 on `/api/admin/*`. Probation check-ins sync to durable storage; local-first offline support preserved. Activity logging uses service role for cross-user visibility.
- **Known limitations and significant unresolved bugs:** Admin portal requires online connection (no offline queue). Only probation connected to Admin; jobs/inventory/proofs remain separate. No granular admin permissions. Activity log not user-facing. BlueAI paused.
- **Implementation / release status:** Admin Portal and probation durable storage implemented, lint/build/tests pass locally. Not yet deployed to production. Migration `drizzle/0006_activity_log.sql` prepared but not applied to Supabase.

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

## Resume Point
- Remediation commit 253fe63e6065b44ad3ce8d922bd4e96a91cda4d0 is pushed and final lint/build passed. Render deployment identity and health are verified. Next verify signed-in save/reload and activity rows. Work paused at 86% five-hour usage used; resume requires user authorization or reset.
- Admin activation needs explicit action-time confirmation because it expands access to other users' sensitive records. Do not assign a role silently.
- Verify a second browser and Admin Overview/Activity/Probation before signing off. Automatic provider completion recognition remains future work.

## Last Updated

## Next CLI: Signed-In Saving Verification

Documentation handoff only; do not build new features. The remediation is pushed and deployed at commit 253fe63e6065b44ad3ce8d922bd4e96a91cda4d0. Production health passed. Database tables and the atomic save function are installed. Local lint/build and 21 focused tests passed; rollback-only database reliability checks passed. The live signed-in flow remains unverified.

1. Read AGENTS.md and this lifeline's startup sections; check usage and Git status. Preserve existing changes. Reuse the deployed work instead of repeating migrations or implementation.
2. Open https://route-manager-phtj.onrender.com and sign in to the intended Route Manager account. Confirm its actual identity; the app header may contain a hardcoded unrelated email. Do not confuse the Supabase dashboard account with the app account.
3. Open More → Monthly Check-In. Confirm Today/Jobs Check In Now reaches that page too. Read the account-sync status. If it shows an error, inspect the authenticated API response and Render storage configuration safely; never expose credentials or forge sessions.
4. Open official CE Check-In from the in-app page to record a harmless start event, then return and wait for Saved to your account. Do not mark completion or upload private proof just to test. Only confirm an actual completed check-in.
5. Reload. Confirm the same start event and timestamp remain and the account-save status is successful. In Supabase, confirm the matching owner/month record and activity event exist. A local/pending save alone is not evidence of account persistence.
6. Sign into the same account in a second browser/device. Open Monthly Check-In and confirm the same month/events load. Do not claim cross-browser verification from a single reload or SQL alone.
7. If older shared browser records exist, use Import my older check-ins only after confirming they belong to this account. Confirm import persists after reload. Preserve the original shared cache; skip this step when none exists.
8. In a controlled test environment, verify failed storage/logging leaves edits pending with a visible error. Retry and confirm activity is not duplicated. Test a new edit during an in-flight save and an account switch during loading/saving; stale responses must not acknowledge newer edits or expose another account's data.
9. Verify an ordinary account is denied Admin access. Authorization must use server-controlled app_metadata only; user_metadata cannot grant access. No server-assigned admin existed at the last database check.
10. Identify the intended Admin account and obtain action-time confirmation before granting its server-controlled Admin role through the dashboard. Browser confirmation policy requires this because it expands access to other users' sensitive records. Preserve existing metadata. Refresh the session afterward. Never change credentials or use user-editable metadata.
11. Confirm Admin Portal appears under More. Verify Overview, Activity, and Probation show the correct account's start event and no false completion. Confirm a different ordinary account remains denied Admin access and sees only its own check-in history. Report any unavailable account/browser check explicitly.
12. Update this lifeline and affected knowledge/memory files with evidence and remaining gaps. Fix only reproduced problems. If code changes, run relevant tests and required lint/build, commit/push, and verify production plus the actual signed-in interaction. Deployment alone is not feature sign-off.

Relevant implementation: src/features/probation/useProbationCheckIn.ts, probationSync.ts, MonthlyCheckInPage.tsx; server/admin/probationRoutes.ts, activityLog.ts; drizzle/0007_probation_atomic_sync.sql.

Remaining: signed-in save/reload, second-browser loading, in-flight sync races, Admin activation/screens, and ordinary-account isolation. Automatic provider completion recognition is future work. The deployment monitor is paused; no background flow verification is running.
2026-10-02 — Remediation implemented; database activated and rollback-only reliability checks passed; deployment pending.
