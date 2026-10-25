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

**Guest sign-in entry (2026-10-25):** Added Bypass sign-in below Sign In, opening the public All in One main menu with an explicit private-feature sign-in restriction. No synthetic identity, account App mount, private cache access or auth/admin change. Corrected stale public-bypass documentation. Root lint/build and 11 focused auth/navigation tests pass after npm ci. Local production preview confirms visible button, disclosure and correct menu URL. Released at 630b2b615232682a19d4556d0f0ee8fd25833a10; GitHub main and exact public Render SHA verified. Public browser confirms visible bypass → main menu → Route Manager returns to login; anonymous admin remains 401. No required implementation work remains.

**Cleaning cloud sync:** User requested account sync. Independent Cleaning Supabase client, shared same-origin session, RLS cloud plans with atomic expected revisions, per-owner offline caches, explicit legacy import and conflict/recovery UI implemented. Migration applied; rollback-only isolation/revision/anonymous/size tests pass. Forty-seven Cleaning tests and final root lint/build pass; local unsigned cloud entry and existing offline plan verified. Existing legacy data untouched; user answer on importing into signed-in account pending. Released at caefb0c3993d279d6cc9fc7318e35295ea35ce60; GitHub main/public exact SHA verified. Live existing-account recovery, cloud write acknowledgement/reload and cloud-side change download verified. Labeled verification space archived and synced; no cleaning completion or timer invented. Database isolation/revision/size/anonymous checks rolled back; zero verification identities remain. Original browser plan preserved; its account import still awaits the user’s answer.

**Due-only cleaning start:** User wants Start cleaning to show only due daily work, adding fortnightly/monthly activities when their dates arrive. Review now excludes future work and empty cadence groups; Start disabled when nothing due. Existing configured dates/lastDone remain unchanged. Thirty-three Cleaning tests/root lint/build pass; local browser Start shows only the remaining due daily work. Released at 6b3eceffb8a02788eaf363b2079b0bbd04831318; GitHub main/public exact SHA verified. Live Start and Get ready both show only toilet/sink daily work; future groups hidden. No data changed or timer started; review left open. No required work remains.

**Cleaning direct finish:** Bathroom Today now has Mark finished → select actually finished due activities → Save. Clears only selected work, retains unfinished due work, schedules next dates, shows finished-today summary and an immediate guarded Undo. Uses existing lastDone; no fake timer/session/history entry. Active sessions finish through Clock out. Thirty-two Cleaning tests/root build/lint pass; local browser partial finish/reload verified. Released at 89c763e4cf05670a0f2e55e2ea803df09eb4940b; GitHub main/public exact SHA verified. Public partial finish removed only toilet, retained sink, set next toilet date tomorrow; Undo/reload restored the exact original schedule with no cleaning left marked finished. Completion modal is open in user tab 4 with nothing selected. No required work remains.

**Photo click retained:** Header profile photo again opens the same left sidebar alongside AIØ17/edge swipe. Released at 62e1c2b2cbe5b5015fbd892706c5e5f556cdbb48; GitHub main/public exact SHA verified. Eight focused tests/root lint/build pass. Public signed-in photo click, close and wordmark reopening verified; photo position unchanged. No required work remains.

**Left sidebar (2026-10-21):** User requested moving profile controls into a left sidebar opened from AIØ17 or an edge swipe, keeping the header photo in place. Native modal dialog with close/backdrop/Escape/left-swipe dismissal, viewport scrolling/body lock and focus handling implemented on codex/left-navigation-sidebar. Eight focused tests/root lint/build pass. Local browser verified full-height left position, focus, body lock, Escape, backdrop and feature-selection dismissal. Released at b3e2df6d9bdfa3760f52ac4521f339f0c53d5838; GitHub main/public exact SHA verified. Live signed-in logo opening, full-height left geometry, body lock, Escape/focus restoration, backdrop dismissal and Inventory navigation verified. Header photo remains at right. Touch gestures unit-tested; physical device swipes not exercised. No required work remains. No feature/data changes.

**Profile navigation consolidation (2026-10-21):** User approved moving useful More/Settings controls below the profile divider, removing Gmail/Open More, More/Settings pages and More bottom tab. Retain Habits/ride tools pending a separate retirement decision. Job creation actions move to Jobs, scanning stays with jobs; support/admin remain grouped. No data deletion. Implemented on codex/profile-navigation; 16 focused tests and root lint/build pass. Local address submit/reload, theme, Inventory, Support, legacy Settings bookmark and scrollable panel verified; Public exact SHA 01cdc0d verified; all retained feature destinations, Proof Vault, address submit and theme roundtrip work. Jobs import/process forms open without creating records. Public check exposed existing page-entry scrolling hiding Jobs controls under the sticky header; changed page entry to scroll to top. Released at 03876f7f63d3f3d6631c826f534522b366ec6ddd; GitHub main/public exact SHA verified. Jobs import button sits below the header and opens its modal after normal navigation. Both old bookmarks redirect to Today. Panel left open in user tab 7. No required work remains; no records created/deleted. Rollback checkpoint checkpoint-2026-10-21-bathroom-dashboard / 8492b234.

**Profile panel layout (2026-10-21):** Compact 48px photo at the upper left, 14px username beside it at the top, and signed-in email below a thin divider. Layout only; dismissal and Open More remain. Released at a08e850442fb89337b79748ae4e98055bb0f3ce0; GitHub main and public exact SHA verified. Root lint/build and 11 profile tests pass. Public signed-in check verified compact photo/name, email/divider, narrow-screen fit, Open More and return/reopen. Width now accounts for right offset after public check exposed left overflow. No required work remains; preserve dist-native.

**Profile dropdown:** User authorized continuing beyond the 85% usage stop to finish/deploy this scoped change. Header avatar opens a photo/name popover; Open More is explicit. Eleven focused tests pass; Released at 1906b6fcb65875f09bbb106ebeb5cf4d68d70c93: GitHub main/public Render exact SHA verified. Eleven focused tests and root lint/build pass. Signed-in browser verified avatar opens photo/name dropdown while staying on Today; Escape/outside click dismiss, Open More navigates to More, popup fits viewport. Dropdown left open in user tabs 1/7. No data changes or required work remains.


**Hallway icon:** Route Manager card now uses its existing black AIØ app artwork, owned as a hallway asset; no routing/data changes. Released at 4bbce3d69fc964ca1f2e86c4290c663e73e6bec3: GitHub main and public Render exact SHA verified. Two hallway tests and root lint/build pass. Local/public icon load verified; clicking the icon opens signed-in Route Manager, and Main menu returns to hallway. No data changes. User tab 1 is left on the hallway. No required work remains.


**2026-10-21 Bathroom dashboard:** Today now centers a large Bathroom card with Today's cleaning, Start cleaning and Upcoming. User-approved schedule: daily toilet/sink wipe-downs; bathroom walls/cabinets/floor every 14 days; shower once per calendar month. Explicit start-date setup reuses the active Bathroom or creates it atomically, with no fake completions. Daily work starts on that date, two-week work starts 14 days later, shower starts one calendar month later. Start date can change before any completed scheduled activity, with no active session. Other spaces/tasks are retained in a collapsed section. Start cleaning selects due activities; a room review allows extras before Get ready → Clock in → Clock out. Linked session metadata identifies exact Bathroom activity IDs. Clock-out updates lastDone only for those explicitly marked finished; unfinished entries remain due. Next due is calculated from actual completion: +1 day, +14 days, or next calendar month with short-month clamping. No session length or generic matching task title implies completion. No duplicate task records are created. Older generic sessions/routines remain separate. V4 plan/link validation preserves old imports. Twenty-nine tests/lint/build/local browser pass; Released at 8492b23438cbcecfb8ca2a11c1dae5cc8a43fa67; GitHub main and public Render exact SHA verified. Twenty-nine tests and root lint/build pass. Public browser verified future/today start-date setup, correct daily/14-day/monthly Upcoming dates, due preselection, tools/clock-in/reload/clock-out and v4 JSON backup roundtrip. Public test clock-out marked zero activities complete and is explicitly annotated as verification; no cleaning was invented. Local partial completion/reload confirmed only finished work advances. User tab 7 is left on the start-date form; Today is open in tab 4. Provisional start date used in verification is today and remains editable. No required work remains; browser-only storage persists.


**2026-10-21 work sessions:** Cleaning now supports room/activity selection → Get ready (plan plus optional tools checklist) → Clock in → hands-off work → Clock out. The current session panel is visible on all Cleaning pages with Pause/Resume, See routine & tools and Clock out. Work uses saved timestamps rather than timer ticks; reload/closing does not end a session. Pause time is excluded. Clock-out requires an explicit All finished or Some work remains choice, supports an optional note, and saves completed/remaining activities plus working/break time in History. No per-step interactions are required while cleaning. Existing tasks/routines are preserved; session outcomes do not silently complete scheduled tasks. Plan v3 saves session snapshots and protects against older clients; old plans still import. Twenty-three tests, root lint/build and local browser pass. Released at f29cc1f59f103a22d5106a7d579e6a4657f016ca: GitHub main and public Render exact SHA verified. Public UI verified preparation/tool toggles, clock-in, running and paused reload recovery, resume, partial clock-out, working/break time and note/unfinished list in History, and actual v3 JSON backup roundtrip. Labeled test room is archived; its session explicitly says no cleaning performed and records zero finished activities. No real session remains running. Bathroom Get ready is left open without clocking in. Twenty-three Cleaning tests and root lint/build pass; no required work remains. Browser-only storage and device-clock limits remain.


**Activity page simplification:** User rejected the final task-details form. Add task now stops at room → activity selection. Activity buttons toggle selection in place; Add selected tasks atomically saves them with any draft room and keeps the same room mini page open with a visible success message. Custom task text is entered inline. Back/Close save nothing. New tasks are one-time, due today, with a disclosed 10-minute estimate; existing task schedules and room routines are unchanged. Task editing remains available separately. Eighteen tests pass; Released at 9ed00c37e7dfa757a0f613cbaf4ba2d1ad2ef39a; GitHub main and public Render exact SHA verified. Eighteen tests and root lint/build pass. Local browser checked multi-selection/save/reload; public browser checked Bathroom selection/deselection without navigation, inline custom selection, same-page Add success, reload persistence and archive. Verification task archived without completion. User tab 7 is left on Bathroom activities; no required work remains.


**Room-first Add task:** Add task now opens a room chooser, then room-specific activities, then task details. User confirmed Dishes belongs inside Kitchen. Kitchen offers Dishes/Counters/Sink/Stove/Floor; Bathroom offers Toilet/Sink/Shower or tub/Mirror/Floor; Bedroom and Living area have their own suggestions. Existing active rooms and custom rooms/tasks are supported. Suggested rooms are drafts: room and task save atomically only on Save task; cancel/back creates no records. Existing active rooms are reused case-insensitively. Archived rooms are not silently restored. Add task works even with no spaces. Edit task retains its direct form. No schema/storage-key or routine change. Eighteen tests, root lint/build and local browser save/reload pass; Released at bdcba1cbf2c19f576c7bf179e7453d0e6e9faf9d; GitHub main and public Render exact SHA verified. Public browser verified Bathroom choices, Kitchen → Dishes → details, Back/Cancel, custom-room entry, save/reload and active Kitchen reuse. Verification task was archived without completing it; no cleaning history added. Eighteen Cleaning tests plus root lint/build pass. Kitchen choices are left open. No required work remains.


**Room routines, 2026-10-20:** Each physical cleaning space now has an optional reusable ordered routine, separate from scheduled tasks. Today shows room entry cards; Spaces offers Build/Edit routine (one step per line) and Start/Continue. A visit snapshots the room name and steps, saves each sequential completion, supports Undo last step and pause/reload, and requires all steps before Finish. Finish records the visit in History; starting again resets the entire checklist, including on the same day. Edits affect future visits, preserving in-progress/history snapshots. Archives retain routines and visits. Browser-only persistence and existing task schedules remain unchanged. Sixteen Cleaning tests, lint/build and local production browser pass; public release verified at b8b2030. Baseline checkpoint-2026-10-20-personal-cleaning at 2d80a9c.


**2026-10-20 Cleaning:** Third independent workspace for personal routines first, future business later. Today/Spaces/History, recurrence, completion/undo, archives and validated backups implemented. Storage is explicitly browser-only. Eleven Cleaning, two hallway and seven gateway tests plus root lint/build pass; local production browser workflow including export/import verified. Implementation 2d80a9cab5536d83806bfeb4e33e0f5e8b2f9220 is on GitHub main and public Render (exact /api/build-info SHA). Public browser verified hallway entry/return, create space/task, complete, history/undo, reload persistence, archive and actual backup export/import. Narrow 675px view has no horizontal overflow. Verification completion was undone and labeled test space archived; no user cleaning history was invented. Eleven Cleaning, two hallway and seven gateway tests plus lint/build pass. Browser-only storage/no cloud sync remains the disclosed limitation.


**2026-10-19 independent app workspaces:** Implementation d5e140ecf286390af75cdb377edc94809243aba9 is on GitHub main/public Render and signed-in verified: parent hallway → /route-manager/ with recovered session → Jobs (same seven jobs) → More (same account) → Inventory (account checked) → parent. Return/header remains visible while scrolled; parent contains no room navigation/account data. Both apps have separate package/source/build/tests; root gateway starts a separate loopback room process, preserving origin and runtime directory. Full room 63-suite/546-test run, 5 focused auth/location tests, hallway 2/gateway 6 tests, lint/build and disposable security checks pass. Follow-up handles old hash bookmarks when hallway is already open and records release evidence. Rollback checkpoint checkpoint-2026-10-19-before-monorepo at 50b1f28 is pushed. Root README is the map; old feature source paths resolve under apps/route-manager. Preserve .env/private runtime data/dist-native; shared cross-app identity/native device checks remain future work.

**2026-10-18 software hallway:** Released and signed-in verified at 2bce1caf06733b9b2a8422f620af861611b4eabd. User chose Route Manager as the first room, with others later. Independent authenticated menu at `/` / `/#home`, lazy room entry and Main menu return; existing feature hashes remain. Three focused tests/lint/build pass. Local entry/return/Back/Forward and public hallway → Route Manager → Jobs → Main menu verified, including visible entry/return controls, account identity, removal of room navigation/assistant and return focus. Existing dist-native preserved. Current production is Render; Railway CLI is unavailable locally.

**2026-10-17 navigation repair:** Deployed and live verified at 514e516. Shared address-preferred navigation covers Dashboard, popup and Preview Guide, retains the app start and labels straight-line estimates. First-job Bike/Walk/Drive each opened Maps with the same configured origin and correct Norris Rd store destination; second-job link uses the first store address as origin. All 27 focused tests, lint/build pass. Initial origin repair exposed a stale pin resolving to another street; listed addresses now take precedence. Saved pins still inform approximate distance/battery planning; Scan capture remains unverified.

**2026-10-17 job popup:** Purple translucent glass surface, bright border and tinted controls deployed at f71a446; public build SHA and signed-in popup appearance, visible footer and Bike selector/navigation URL verified. Lint/build and six popup tests pass. Read-only Inventory review confirmed the signed-in email and successful empty account read. Full inventory write/device validation remains open.

**2026-10-10 inventory account sync:** Owner-scoped local queues/ledgers, explicit legacy import, cloud ledger persistence/conflict protection, account-only job discovery and current-account header deployed at bc4cc6451865652ae07dae9bf8b4f020816cc976. GitHub main and public build-info confirm that commit. Migration 0008 applied and rollback-tested; 51 focused tests, lint, build and disposable production-bundle API checks pass. Signed-in UI verification is blocked by the browser tool connection closing. Standalone Proof Vault and main job sync remain separate; physical-photo checks and conflict/archival UI remain open.

**2026-10-10 app connections:** User requested a broader audit of disconnected and unfinished features. Fixed the dead empty Proof Vault/newest-only entry with an all-folder browser, and restored compact selected-job Preview Guide, Scan and Inventory shortcuts. Job access gating and the simplified popup remain. Twenty-three relevant tests, lint and build pass. Deployed and signed-in verified at efad8a3: empty Proof Vault, selected-job Preview Guide and return, Scan, correct Inventory job/domain, and fixed-footer visibility without scrolling. Older-folder browsing/evidence preservation verified with disposable test records, not fabricated production evidence. Preview Guide, proof and inventory documentation previously overstated popup controls; corrected current entry points. Durable local-data sync and retired procedure/closeout UI remain unfinished.

**2026-10-10 non-iOS follow-through:** Reviewed unfinished Markdown work. Check-in account-lifetime gaps are fixed locally: generation-guarded proof/errors, sync cancellation and screen-track cleanup. Twenty-two focused tests, lint/build and disposable production-bundle ordinary-account checks pass; deployed and live verified at c8747d1. Scheduling weather/AQ and voice, durable inventory/proof storage and legacy ownership migration remain unfinished. Physical-device/provider/access-dependent checks stay open; BlueAI stays paused.

**2026-10-10 security:** Latest Security Cloud scan: 13 findings on 02fb4436 (10 medium/3 low). Remediation deployed from codex/security-scan-hardening to main/Render at d223cbe, separate from native iOS PR9. Contracts, preservation policy, quota limits and release evidence: docs/SECURITY_SCAN_2026_10_10.md. Public exact-SHA/health and anonymous image denial verified; authenticated account sync and durable quota event verified. No clean rescan/finding closure claimed. Remaining upstream build-tool alerts, legacy Sites deployment and real-photo/device verification are documented.


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

- User chose a Bathroom-focused Today dashboard. Daily toilet/sink wipe-downs, 14-day walls/cabinets/floor, calendar-month shower. Select a start date; clock-out advances only explicit finished linked work. Larger jobs start after the first interval; no manufactured cleaning history.


- User approved prepare-tools → clock in → work with phone down → clock out. Prefer session-level outcome over mandatory per-step checks. Persist timestamp/break accounting and show unfinished work in History. No cloud or customer/workforce workflow in this slice.


- User wants Add task to stop at the room activity page. Select/add there without the final settings form; this supersedes the prior three-step picker.


- User confirmed room-first task creation: Dishes is inside Kitchen. Keep choices customizable and save draft rooms only with their task.


- User wants a repeatable regimen for each physical room. Implement full ordered checklists per visit (working assumption from “every time”), separate from scheduled tasks. Persist partial progress and keep immutable visit snapshots. Version-2 routine plans reject older app clients to prevent field loss; old plans still import.


- Cleaning starts as the user's personal planner. Independent source/build/storage, URL-linked from hallway. Business workflows remain deferred. Cloud sync authorized 2026-10-21; unassigned browser-plan import still requires explicit ownership confirmation.


### D-003 — Independent software workspaces

- **2026-10-19 accepted:** One root repository with independent apps/hallway and apps/route-manager packages, source, builds and tests; URLs connect them. Root gateway owns hosting and launches room as a separate loopback process, preserving original browser origin and runtime-data directory. Room owns login; public hallway reads no account data. Supersedes embedded SoftwareShell. Details: knowledge/decisions/2026-10-19-independent-app-workspaces.md.

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

### 2026-10-19 — Parent and room workspace migration

- User rejected the earlier hallway being inside Route Manager; approved independently runnable apps in one manageable repository. Recorded/pushed pre-migration checkpoint, isolated branch, workspace packages/source/build/tests, root gateway/commands and project map. GitHub main and public Render confirm d5e140e. Signed-in hallway → independent room → Jobs → More → Inventory account read → parent verified; sticky return, account/session continuity and anonymous API 401 verified. Full room regressions, focused auth tests, hallway/gateway, lint/build and disposable production-bundle security checks pass. No production records/evidence fabricated. Root worker retires without clearing data; room worker is scoped to its path. Mac/iPhone/native capture validation remains separate. Follow-up includes compatibility for hash changes while hallway is already open.

### 2026-10-18 — Independent software hallway

- User selected Route Manager as the first software room, with other rooms later. Added a separate authenticated main menu outside App.tsx, lazy room entry, Main menu return, browser navigation handling and legacy hash support. Existing room features/data stay inside Route Manager; no backend split or migration.
- Three focused shell tests, lint and build pass. Local visible menu, room entry, return with focus and browser Back/Forward verified. GitHub main and public Render build-info confirm implementation 2bce1ca; signed-in hallway → room → Jobs → hallway and visible menu/return controls verified. Health passes. Deployment dashboard requires login, so exact public SHA is deployment evidence. No production evidence/records fabricated. Remaining software rooms are future work.

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

Current open work (2026-10-10): inventory signed-in UI verification after browser access recovers; scheduling weather/AQ and voice phases; durable standalone proof storage; legacy ownership migration outside inventory; broader atomic quotas and retention. Inventory persistence and its explicit legacy import are implemented with atomic storage caps. Physical iPhone checks, separate ordinary-account production login, a supported CE recognition contract and legacy Sites access remain dependencies. Native iOS is excluded from the current task.

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

**Guest sign-in entry (2026-10-25):** Added Bypass sign-in below Sign In, opening the public All in One main menu with an explicit private-feature sign-in restriction. No synthetic identity, account App mount, private cache access or auth/admin change. Corrected stale public-bypass documentation. Root lint/build and 11 focused auth/navigation tests pass after npm ci. Local production preview confirms visible button, disclosure and correct menu URL. Released at 630b2b615232682a19d4556d0f0ee8fd25833a10; GitHub main and exact public Render SHA verified. Public browser confirms visible bypass → main menu → Route Manager returns to login; anonymous admin remains 401. No required implementation work remains.

**Cleaning cloud sync:** User requested account sync. Independent Cleaning Supabase client, shared same-origin session, RLS cloud plans with atomic expected revisions, per-owner offline caches, explicit legacy import and conflict/recovery UI implemented. Migration applied; rollback-only isolation/revision/anonymous/size tests pass. Forty-seven Cleaning tests/root lint/build pass (final build pending latest UI adjustments). Existing legacy data untouched; user answer on importing into signed-in account pending. Released at caefb0c3993d279d6cc9fc7318e35295ea35ce60; GitHub main/public exact SHA verified. Live existing-account recovery, cloud write acknowledgement/reload and cloud-side change download verified. Labeled verification space archived and synced; no cleaning completion or timer invented. Database isolation/revision/size/anonymous checks rolled back; zero verification identities remain. Original browser plan preserved; its account import still awaits the user’s answer.

**Due-only cleaning start:** User wants Start cleaning to show only due daily work, adding fortnightly/monthly activities when their dates arrive. Review now excludes future work and empty cadence groups; Start disabled when nothing due. Existing configured dates/lastDone remain unchanged. Thirty-three Cleaning tests/root lint/build pass; local browser Start shows only the remaining due daily work. Released at 6b3eceffb8a02788eaf363b2079b0bbd04831318; GitHub main/public exact SHA verified. Live Start and Get ready both show only toilet/sink daily work; future groups hidden. No data changed or timer started; review left open. No required work remains.

**Cleaning direct finish:** Bathroom Today now has Mark finished → select actually finished due activities → Save. Clears only selected work, retains unfinished due work, schedules next dates, shows finished-today summary and an immediate guarded Undo. Uses existing lastDone; no fake timer/session/history entry. Active sessions finish through Clock out. Thirty-two Cleaning tests/root build/lint pass; local browser partial finish/reload verified. Released at 89c763e4cf05670a0f2e55e2ea803df09eb4940b; GitHub main/public exact SHA verified. Public partial finish removed only toilet, retained sink, set next toilet date tomorrow; Undo/reload restored the exact original schedule with no cleaning left marked finished. Completion modal is open in user tab 4 with nothing selected. No required work remains.

**Photo click retained:** Header profile photo again opens the same left sidebar alongside AIØ17/edge swipe. Released at 62e1c2b2cbe5b5015fbd892706c5e5f556cdbb48; GitHub main/public exact SHA verified. Eight focused tests/root lint/build pass. Public signed-in photo click, close and wordmark reopening verified; photo position unchanged. No required work remains.

**Left sidebar (2026-10-21):** User requested moving profile controls into a left sidebar opened from AIØ17 or an edge swipe, keeping the header photo in place. Native modal dialog with close/backdrop/Escape/left-swipe dismissal, viewport scrolling/body lock and focus handling implemented on codex/left-navigation-sidebar. Eight focused tests/root lint/build pass. Local browser verified full-height left position, focus, body lock, Escape, backdrop and feature-selection dismissal. Released at b3e2df6d9bdfa3760f52ac4521f339f0c53d5838; GitHub main/public exact SHA verified. Live signed-in logo opening, full-height left geometry, body lock, Escape/focus restoration, backdrop dismissal and Inventory navigation verified. Header photo remains at right. Touch gestures unit-tested; physical device swipes not exercised. No required work remains. No feature/data changes.

**Profile navigation consolidation (2026-10-21):** User approved moving useful More/Settings controls below the profile divider, removing Gmail/Open More, More/Settings pages and More bottom tab. Retain Habits/ride tools pending a separate retirement decision. Job creation actions move to Jobs, scanning stays with jobs; support/admin remain grouped. No data deletion. Implemented on codex/profile-navigation; 16 focused tests and root lint/build pass. Local address submit/reload, theme, Inventory, Support, legacy Settings bookmark and scrollable panel verified; Public exact SHA 01cdc0d verified; all retained feature destinations, Proof Vault, address submit and theme roundtrip work. Jobs import/process forms open without creating records. Public check exposed existing page-entry scrolling hiding Jobs controls under the sticky header; changed page entry to scroll to top. Released at 03876f7f63d3f3d6631c826f534522b366ec6ddd; GitHub main/public exact SHA verified. Jobs import button sits below the header and opens its modal after normal navigation. Both old bookmarks redirect to Today. Panel left open in user tab 7. No required work remains; no records created/deleted. Rollback checkpoint checkpoint-2026-10-21-bathroom-dashboard / 8492b234.

**Profile panel layout (2026-10-21):** Compact 48px photo at the upper left, 14px username beside it at the top, and signed-in email below a thin divider. Layout only; dismissal and Open More remain. Released at a08e850442fb89337b79748ae4e98055bb0f3ce0; GitHub main and public exact SHA verified. Root lint/build and 11 profile tests pass. Public signed-in check verified compact photo/name, email/divider, narrow-screen fit, Open More and return/reopen. Width now accounts for right offset after public check exposed left overflow. No required work remains; preserve dist-native.

**Profile dropdown:** codex/profile-dropdown, AioHeader and focused tests updated. Released at 1906b6fcb65875f09bbb106ebeb5cf4d68d70c93: GitHub main/public Render exact SHA verified. Eleven focused tests and root lint/build pass. Signed-in browser verified avatar opens photo/name dropdown while staying on Today; Escape/outside click dismiss, Open More navigates to More, popup fits viewport. Dropdown left open in user tabs 1/7. No data changes or required work remains. Usage exception authorized for this change only. Preserve dist-native.


**Hallway icon:** Implemented on codex/hallway-route-manager-icon. Root lint/build, two hallway tests and local image-load/visual checks pass. Released at 4bbce3d69fc964ca1f2e86c4290c663e73e6bec3: GitHub main and public Render exact SHA verified. Two hallway tests and root lint/build pass. Local/public icon load verified; clicking the icon opens signed-in Route Manager, and Main menu returns to hallway. No data changes. User tab 1 is left on the hallway. No required work remains. Preserve dist-native.


**Bathroom dashboard:** Implemented on codex/bathroom-schedule-dashboard. Twenty-nine tests/root lint/build/local browser full partial-finish flow pass. Released at 8492b23438cbcecfb8ca2a11c1dae5cc8a43fa67; GitHub main and public Render exact SHA verified. Twenty-nine tests and root lint/build pass. Public browser verified future/today start-date setup, correct daily/14-day/monthly Upcoming dates, due preselection, tools/clock-in/reload/clock-out and v4 JSON backup roundtrip. Public test clock-out marked zero activities complete and is explicitly annotated as verification; no cleaning was invented. Local partial completion/reload confirmed only finished work advances. User tab 7 is left on the start-date form; Today is open in tab 4. Provisional start date used in verification is today and remains editable. No required work remains; browser-only storage persists. Baseline checkpoint-2026-10-21-cleaning-sessions at f29cc1f. Preserve dist-native.


**2026-10-21 work sessions:** Implemented on codex/cleaning-work-sessions. Twenty-three tests, root lint/build and local browser prepare/start/reload/pause/resume/partial-finish/history pass. Released at f29cc1f59f103a22d5106a7d579e6a4657f016ca: GitHub main and public Render exact SHA verified. Public UI verified preparation/tool toggles, clock-in, running and paused reload recovery, resume, partial clock-out, working/break time and note/unfinished list in History, and actual v3 JSON backup roundtrip. Labeled test room is archived; its session explicitly says no cleaning performed and records zero finished activities. No real session remains running. Bathroom Get ready is left open without clocking in. Twenty-three Cleaning tests and root lint/build pass; no required work remains. Browser-only storage and device-clock limits remain. Baseline checkpoint-2026-10-20-room-routines / b8b2030. Preserve dist-native.


**Activity picker:** Implemented on codex/simplify-task-picker. Eighteen tests pass; Released at 9ed00c37e7dfa757a0f613cbaf4ba2d1ad2ef39a; GitHub main and public Render exact SHA verified. Eighteen tests and root lint/build pass. Local browser checked multi-selection/save/reload; public browser checked Bathroom selection/deselection without navigation, inline custom selection, same-page Add success, reload persistence and archive. Verification task archived without completion. User tab 7 is left on Bathroom activities; no required work remains. Preserve dist-native and existing records.


**Task picker:** Implemented on codex/room-first-task-picker; 18 Cleaning tests pass. Released at bdcba1cbf2c19f576c7bf179e7453d0e6e9faf9d; GitHub main and public Render exact SHA verified. Public browser verified Bathroom choices, Kitchen → Dishes → details, Back/Cancel, custom-room entry, save/reload and active Kitchen reuse. Verification task was archived without completing it; no cleaning history added. Eighteen Cleaning tests plus root lint/build pass. Kitchen choices are left open. No required work remains. Preserve dist-native and existing routine data.


**Room routines:** Implemented on codex/cleaning-room-routines; local browser creation/steps/reload/history and 16 tests/lint/build pass. Released at b8b20303fd2d256ac6c0efcc2f32795cebab8100: GitHub main and public Render exact build SHA verified. Public browser verified editor/start, sequential completion, reload/resume, finish/history snapshots, fresh same-day restart, archive retention, backup download/import and hallway return. Labeled test space is archived; one clearly labeled test visit remains in History. Sixteen Cleaning tests and root lint/build pass. No required work remains; browser-only storage is still disclosed. Preserve dist-native.


**2026-10-20 Cleaning:** Local implementation/checks complete on codex/cleaning-planner. Release complete: Implementation 2d80a9cab5536d83806bfeb4e33e0f5e8b2f9220 is on GitHub main and public Render (exact /api/build-info SHA). Public browser verified hallway entry/return, create space/task, complete, history/undo, reload persistence, archive and actual backup export/import. Narrow 675px view has no horizontal overflow. Verification completion was undone and labeled test space archived; no user cleaning history was invented. Eleven Cleaning, two hallway and seven gateway tests plus lint/build pass. Browser-only storage/no cloud sync remains the disclosed limitation. No required implementation work remains. Baseline checkpoint-2026-10-19-independent-app-workspaces at dc9fd7d13bd6349953a3a2a25e3339c3348ebc66. Preserve dist-native. Details: knowledge/features/cleaning-planner.md.


**2026-10-19 workspace migration:** Core migration d5e140e is deployed and public signed-in navigation/session/data reads verified. Release follow-up records evidence and covers old hash links while the hallway is already loaded; check latest Git log/public SHA for that small follow-up. Workspace/source map: root README and knowledge/README. No more software rooms or shared identity implementation requested. Do not repeat migrations or completed API/security/full regression checks without relevant changes. Preserve checkpoint-2026-10-19-before-monorepo/50b1f28, root private runtime files and dist-native/iOS draft. Native Mac/device checks remain separate.

**2026-10-18 software hallway:** Finished: implementation 2bce1ca is on github/main and public Render, signed-in menu/room/Jobs/return plus removal of room UI and return focus verified. Three focused tests/lint/build and local browser Back/Forward pass. This follow-up records release evidence only; no further feature work requested. Future software can be added through src/shell/SoftwareShell.tsx. Frontend/lifecycle separation shares existing auth/backend; unsaved room UI closes on exit. Preserve dist-native/iOS and unrelated open work.

**2026-10-17 navigation repair:** Finished: GitHub main and public Render commit 514e516 verified, all three real Maps mode/start/destination screens checked, second-leg origin and estimate label verified. No further release checks needed for this fix. Separate remaining work: saved-coordinate accuracy for approximate planning and physical scan capture/stitching. Preserve dist-native/iOS draft; do not enable Test Lab in production or fabricate job evidence.

**2026-10-17 first-job walkthrough:** Opened Jobs > first Today job (Family Dollar, Norris Rd), selected Bike/Walk/Drive and clicked Navigate each time. Google Maps opened with Cycling/Walking/Driving respectively and the matching address. Popup estimates differed from Maps; modal builds address-only links without origin and ignores supplied navLink/transitOrigin, so Maps chooses its own starting point. Scan opened the correct job setup; closed without creating evidence. Test Lab is development-only and unavailable on production. Physical camera/stitching not tested. No application code changed for this walkthrough.

**2026-10-17 job popup:** Completed and live verified at f71a446. No further popup work pending. User reiterated concise context/usage and stopped the broader app review; do not restart it automatically. Preserve untracked dist-native. Inventory signed-in email/empty read now verified, while full write/device checks remain open.

**2026-10-10 inventory:** Code bc4cc64 is pushed and public Render build-info verified. Resume signed-in Inventory account loading/retry/selector/header verification when the browser connection recovers; it currently returns Transport closed. No fake production custody records. Migration and rollback checks are complete; do not repeat them. Restore the existing Supabase Untitled SQL editor to its previous activity/probation table-existence and admin-account-count query; it currently contains the completed rollback test. Preserve iOS draft and dist-native. Usage meter also disconnected; last successful five-hour reading was 2% after its reset.

**2026-10-10 connections:** Connections release complete: main/Render efad8a3 and signed-in entry points/visibility verified. Continue broader unfinished work from knowledge/memory/current-priorities.md; recording/camera/device and local-data durability remain separate. Preserve dist-native and iOS PR9. No production job/evidence data should be fabricated for verification.

**2026-10-10 non-iOS:** Account-lifetime fixes and automated ordinary-account coverage complete locally; deployed and live verified at c8747d1. Tests/lint/build pass. Signed-in production is accessible and the prior pending=false/Saved acknowledgment is verified. Preserve the iOS draft and untracked dist-native. The next non-iOS work is listed at the top of knowledge/memory/current-priorities.md; earlier browser-access blockers below are historical.

**2026-10-10 security:** Latest Security Cloud scan: 13 findings on 02fb4436 (10 medium/3 low). Remediation deployed from codex/security-scan-hardening to main/Render at d223cbe, separate from native iOS PR9. Contracts, preservation policy, quota limits and release evidence: docs/SECURITY_SCAN_2026_10_10.md. Public exact-SHA/health and anonymous image denial verified; authenticated account sync and durable quota event verified. No clean rescan/finding closure claimed. Remaining upstream build-tool alerts, legacy Sites deployment and real-photo/device verification are documented.

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

### 2026-10-10 — Security Cloud review and hardening

Verified all 13 findings against production main and started isolated remediation. Added pre-parser authentication, durable admission budgets, proof-byte/barcode validation and owner-only images, bounded proof/probation storage, isolated transit caches, production bypass removal, owner-scoped scans/conversations, retired legacy Worker APIs and locked Apple tooling. Lint/build, 512 full-suite tests, 25 final focused tests and disposable production-server security checks pass. Public Render commit d223cbe/health and anonymous image 401 verified; signed-in account sync and durable quota events verified. Final paired-transit UI check passed (nearby stops and 12 live alerts together); see remediation guide. Native iOS draft is preserved on its original remote branch.

### 2026-10-10 — Non-iOS unfinished work follow-through
- Reviewed the Markdown backlog, corrected current release/access status and listed remaining development versus device/provider/infrastructure dependencies. BlueAI remains paused; iOS is excluded.
- Fixed reproduced delayed proof adoption after A→B→A, stale proof errors and uncanceled sync; stopped screen-sharing tracks on account changes/unmount/preparation failure.
- Twenty-two focused tests, lint/build and disposable production-bundle ordinary-account isolation/stale-write/admin-denial checks pass.
- c8747d1 pushed and live on Render; exact public SHA/health and signed-in Saved/Retry/GET 200/pending=false verified. Real-device and second ordinary-account production checks remain open.

### 2026-10-10 — Inventory account sync
- Added owner/domain/job-scoped local ledgers and queues, explicit non-destructive legacy import, full item/event/evidence persistence, conflict rejection and account-saved job discovery. Corrected the Inventory header to use the signed-in email.
- Applied migration 0008 with service-role-only access and atomic history/storage enforcement; rollback fixtures verified isolation, replay, append, conflict, evidence preservation and quotas.
- All 51 focused tests, lint/build and disposable production-bundle API checks pass. Application commit bc4cc64 pushed to GitHub main and confirmed by public Render build-info.
- Signed-in interface verification remains blocked by browser Transport closed. Physical photo checks, standalone Proof Vault durability and inventory archival/conflict UI remain open; no production custody evidence was fabricated.

### 2026-10-20 — Personal Cleaning room

- User requested a fresh personal app, eventually their own cleaning business. Added apps/cleaning, gateway static route and hallway URL entry.
- Personal routines/history/undo, archives, additive backups and guarded local writes; existing Route Manager source unchanged.
- Focused tests, lint/build and local browser workflow pass; public release verified at 2d80a9c.

### 2026-10-20 — Repeatable room routines

- Added per-space reusable steps and sequential saved visits; repeat starts fresh every time.
- Today room shortcuts, Spaces editor/runner and visit snapshots in History; existing tasks/data retained.
- Sixteen tests, lint/build and local browser workflow pass. Released at b8b20303fd2d256ac6c0efcc2f32795cebab8100: GitHub main and public Render exact build SHA verified. Public browser verified editor/start, sequential completion, reload/resume, finish/history snapshots, fresh same-day restart, archive retention, backup download/import and hallway return. Labeled test space is archived; one clearly labeled test visit remains in History. Sixteen Cleaning tests and root lint/build pass. No required work remains; browser-only storage is still disclosed.

### 2026-10-20 — Room-first Add task

- User confirmed Dishes belongs inside Kitchen. Added room → activity → details mini pages, custom choices and empty-plan entry.
- Draft room/task save atomically; cancel/back leave data unchanged. Existing task editing and routines preserved.
- Eighteen Cleaning tests pass; Released at bdcba1cbf2c19f576c7bf179e7453d0e6e9faf9d; GitHub main and public Render exact SHA verified. Public browser verified Bathroom choices, Kitchen → Dishes → details, Back/Cancel, custom-room entry, save/reload and active Kitchen reuse. Verification task was archived without completing it; no cleaning history added. Eighteen Cleaning tests plus root lint/build pass. Kitchen choices are left open. No required work remains.

### 2026-10-20 — Keep task creation on the activity page

- User rejected the third details page. Replaced navigation with toggle selection, inline custom input and atomic Add selected tasks.
- Saves one-time tasks for today and stays on the same mini page; editing remains separate. Eighteen tests pass; public Released at 9ed00c37e7dfa757a0f613cbaf4ba2d1ad2ef39a; GitHub main and public Render exact SHA verified. Eighteen tests and root lint/build pass. Local browser checked multi-selection/save/reload; public browser checked Bathroom selection/deselection without navigation, inline custom selection, same-page Add success, reload persistence and archive. Verification task archived without completion. User tab 7 is left on Bathroom activities; no required work remains.

### 2026-10-21 — Hands-off cleaning sessions

- User approved tools preparation, clock-in, hands-off work and clock-out. Added optional tool checklist, persistent timer/breaks, explicit finish outcome and notes/history.
- Plan v3 session snapshots, one active session, backward-compatible imports and guarded storage; existing tasks/routines retained.
- Twenty-three tests/lint/build and local production browser pass. Released at f29cc1f59f103a22d5106a7d579e6a4657f016ca: GitHub main and public Render exact SHA verified. Public UI verified preparation/tool toggles, clock-in, running and paused reload recovery, resume, partial clock-out, working/break time and note/unfinished list in History, and actual v3 JSON backup roundtrip. Labeled test room is archived; its session explicitly says no cleaning performed and records zero finished activities. No real session remains running. Bathroom Get ready is left open without clocking in. Twenty-three Cleaning tests and root lint/build pass; no required work remains. Browser-only storage and device-clock limits remain.

### 2026-10-21 — Bathroom schedule dashboard

- User approved the exact daily/two-week/monthly Bathroom schedule and a simple Today/Upcoming room UI. Added explicit start date and grouped older planning under Other spaces & tasks.
- Due work is preselected; explicit linked clock-out outcomes advance dates, with unfinished work retained. V4 protects schedule fields and imports older plans.
- Twenty-nine tests, root lint/build and local partial-finish/reload browser checks pass. Released at 8492b23438cbcecfb8ca2a11c1dae5cc8a43fa67; GitHub main and public Render exact SHA verified. Twenty-nine tests and root lint/build pass. Public browser verified future/today start-date setup, correct daily/14-day/monthly Upcoming dates, due preselection, tools/clock-in/reload/clock-out and v4 JSON backup roundtrip. Public test clock-out marked zero activities complete and is explicitly annotated as verification; no cleaning was invented. Local partial completion/reload confirmed only finished work advances. User tab 7 is left on the start-date form; Today is open in tab 4. Provisional start date used in verification is today and remains editable. No required work remains; browser-only storage persists.

### 2026-10-21 — Route Manager hallway artwork

- User requested the room's own symbol on its hallway button. Reused the existing black AIØ app icon as a bundled hallway asset. Released at 4bbce3d69fc964ca1f2e86c4290c663e73e6bec3: GitHub main and public Render exact SHA verified. Two hallway tests and root lint/build pass. Local/public icon load verified; clicking the icon opens signed-in Route Manager, and Main menu returns to hallway. No data changes. User tab 1 is left on the hallway. No required work remains.

### 2026-10-21 — Profile dropdown

- Replaced immediate avatar → More with a native photo/name popup and explicit Open More. No unrequested menu items. User authorized completion/deployment past the usage threshold.
- Eleven focused tests pass; Released at 1906b6fcb65875f09bbb106ebeb5cf4d68d70c93: GitHub main/public Render exact SHA verified. Eleven focused tests and root lint/build pass. Signed-in browser verified avatar opens photo/name dropdown while staying on Today; Escape/outside click dismiss, Open More navigates to More, popup fits viewport. Dropdown left open in user tabs 1/7. No data changes or required work remains.

### 2026-10-21 — Compact profile panel

- Smaller upper-left photo and top-aligned username; account email below a thin divider.
- Width follows available space beside the header anchor to avoid narrow-screen left clipping.
- Released/verified a08e850; lint/build, 11 profile tests and live interaction pass.

### 2026-10-21 — Profile navigation replaces More/Settings

- Retained controls/feature shortcuts now live below the profile divider; Gmail/Open More and More/Settings pages/bottom tab removed. Habits and ride tools retained.
- Jobs owns import/process creation; job details retain scanning. Support groups diagnostic entry points and conditional dev helpers; sample-stop reset/manual removed from normal UI.
- Sixteen focused tests and root lint/build pass. Local form/theme/navigation and signed-in public destinations, proof, Jobs forms, bookmark redirects and narrow scrollable panel verified.
- Public verification caught sticky-header overlap; page entry now scrolls to the top. Released/verified 03876f7; saved records unchanged.

### 2026-10-21 — Left navigation sidebar

- AIØ17 opens a modal left sidebar; the right header photo stays in place. Existing controls retained. Edge swipe opens and left swipe closes; vertical/form/other-modal gestures are excluded.
- Native dialog supplies focus containment/Escape/inert background, with backdrop/close dismissal, body scroll lock, safe areas and reduced motion.
- Eight focused tests/root lint/build pass. Public exact SHA b3e2df6 and signed-in drawer layout, logo, dismissal, focus and destination navigation verified; touch gestures covered in unit tests, not on a physical device.

### 2026-10-21 — Retain photo click

- Header photo remains a button opening the shared left sidebar, alongside AIØ17 and edge-swipe entry. User explicitly requested preserving this interaction.
- Eight focused tests/root lint/build pass; public exact SHA 62e1c2b and both clickable entries verified.

### 2026-10-21 — Complete Bathroom work from Today

- Mark finished opens an unchecked due-only checklist. Save advances selected lastDone dates, clears those items from Today and shows finished-today/Upcoming; no session or working time invented.
- Active timers use Clock out; immediate guarded Undo is available until reload/other-tab update. Existing v4 schema/backups remain.
- Thirty-two Cleaning tests/root lint/build pass, including failed persistence, partial finish/reload, undo and active-session protection. Local/public full interaction verified at 89c763e. Public test was immediately undone and reload-confirmed; no real cleaning was fabricated.

### 2026-10-21 — Start shows due work only

- Bathroom Start excludes future activities and empty cadence groups. Daily work appears now; walls/cabinets/floor join at their 14-day due date, shower at its calendar-month due date. No extra-cleaning shortcut when nothing is due. Existing dates and completions preserved.
- Thirty-three Cleaning tests/root lint/build pass; stage tests cover daily, 14-day and monthly selection/preparation. Public daily Start/Get ready verified at 6b3ecef.

### 2026-10-21 — Cleaning account cloud sync

- Independent Cleaning Supabase client reuses the existing account session. Complete plans sync to owner-RLS PostgreSQL snapshots with atomic expected revisions; no Route Manager implementation imported.
- Offline account caches, honest pending/error/retry, canonical acknowledgement reconciliation, stale-response/account-lifetime guards and conflict recovery preserve device work. Explicit unowned browser-plan import; original data is retained.
- Forty-seven Cleaning tests/root lint/build pass. Migration applied; rollback-only account isolation, stale-write, direct/anonymous denial and size tests pass.
- Released at caefb0c3993d279d6cc9fc7318e35295ea35ce60; GitHub main/public exact SHA verified. Live existing-account recovery, cloud write acknowledgement/reload and cloud-side change download verified. Labeled verification space archived and synced; no cleaning completion or timer invented. Database isolation/revision/size/anonymous checks rolled back; zero verification identities remain. Original browser plan preserved; its account import still awaits the user’s answer.

### 2026-10-25 — Guest main-menu entry

**Guest sign-in entry (2026-10-25):** Added Bypass sign-in below Sign In, opening the public All in One main menu with an explicit private-feature sign-in restriction. No synthetic identity, account App mount, private cache access or auth/admin change. Corrected stale public-bypass documentation. Root lint/build and 11 focused auth/navigation tests pass after npm ci. Local production preview confirms visible button, disclosure and correct menu URL. Released at 630b2b615232682a19d4556d0f0ee8fd25833a10; GitHub main and exact public Render SHA verified. Public browser confirms visible bypass → main menu → Route Manager returns to login; anonymous admin remains 401. No required implementation work remains.
