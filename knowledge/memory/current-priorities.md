# Due-only cleaning start

Complete/deployed at 6b3ecef. Start/Get ready show only due work, not future extras. Thirty-three tests/root lint/build pass; public daily-only review/preparation verified. Existing schedule unchanged; no session started.

# Cleaning direct finish

Complete/deployed at 89c763e. Today offers Mark finished without clock-in; selected work clears and next dates advance. Immediate guarded Undo, finished-today summary, existing active-session Clock out and failure protection verified. Thirty-two tests/root lint/build pass; live test undone and original state reload-confirmed. No required work remains.

# Left navigation sidebar

Complete/deployed at b3e2df6. Eight focused tests/root lint/build pass; live logo opening, left layout, close/Escape/backdrop, focus, feature navigation and unchanged right-hand avatar verified. Swipe behavior covered by gesture tests; no physical-device swipe claim.

# Profile navigation consolidation

Complete and deployed at 03876f7. Sixteen focused tests/root lint/build and signed-in public navigation, address/theme controls, Jobs forms, old bookmark redirects and visibility checks pass. No saved feature data removed. Habits and ride tools remain until a separate retirement decision.

# Current Priorities

## Bathroom schedule (2026-10-21)

Today now centers a large Bathroom card with Today's cleaning, Start cleaning and Upcoming. User-approved schedule: daily toilet/sink wipe-downs; bathroom walls/cabinets/floor every 14 days; shower once per calendar month. Explicit start-date setup reuses the active Bathroom or creates it atomically, with no fake completions. Daily work starts on that date, two-week work starts 14 days later, shower starts one calendar month later. Start date can change before any completed scheduled activity, with no active session. Other spaces/tasks are retained in a collapsed section. Start cleaning selects due activities; a room review allows extras before Get ready → Clock in → Clock out. Linked session metadata identifies exact Bathroom activity IDs. Clock-out updates lastDone only for those explicitly marked finished; unfinished entries remain due. Next due is calculated from actual completion: +1 day, +14 days, or next calendar month with short-month clamping. No session length or generic matching task title implies completion. No duplicate task records are created. Older generic sessions/routines remain separate. Twenty-nine tests/lint/build/local browser pass; Released at 8492b23438cbcecfb8ca2a11c1dae5cc8a43fa67; GitHub main and public Render exact SHA verified. Twenty-nine tests and root lint/build pass. Public browser verified future/today start-date setup, correct daily/14-day/monthly Upcoming dates, due preselection, tools/clock-in/reload/clock-out and v4 JSON backup roundtrip. Public test clock-out marked zero activities complete and is explicitly annotated as verification; no cleaning was invented. Local partial completion/reload confirmed only finished work advances. User tab 7 is left on the start-date form; Today is open in tab 4. Provisional start date used in verification is today and remains editable. No required work remains; browser-only storage persists.

## Hands-off cleaning sessions (2026-10-21)

Cleaning now supports room/activity selection → Get ready (plan plus optional tools checklist) → Clock in → hands-off work → Clock out. The current session panel is visible on all Cleaning pages with Pause/Resume, See routine & tools and Clock out. Work uses saved timestamps rather than timer ticks; reload/closing does not end a session. Pause time is excluded. Clock-out requires an explicit All finished or Some work remains choice, supports an optional note, and saves completed/remaining activities plus working/break time in History. No per-step interactions are required while cleaning. Existing tasks/routines are preserved; session outcomes do not silently complete scheduled tasks. Twenty-three tests/lint/build/local browser pass; Released at f29cc1f59f103a22d5106a7d579e6a4657f016ca: GitHub main and public Render exact SHA verified. Public UI verified preparation/tool toggles, clock-in, running and paused reload recovery, resume, partial clock-out, working/break time and note/unfinished list in History, and actual v3 JSON backup roundtrip. Labeled test room is archived; its session explicitly says no cleaning performed and records zero finished activities. No real session remains running. Bathroom Get ready is left open without clocking in. Twenty-three Cleaning tests and root lint/build pass; no required work remains. Browser-only storage and device-clock limits remain.

## Activity page simplification

User rejected the final task-details form. Add task now stops at room → activity selection. Activity buttons toggle selection in place; Add selected tasks atomically saves them with any draft room and keeps the same room mini page open with a visible success message. Custom task text is entered inline. Back/Close save nothing. New tasks are one-time, due today, with a disclosed 10-minute estimate; existing task schedules and room routines are unchanged. Task editing remains available separately. Eighteen tests pass; Released at 9ed00c37e7dfa757a0f613cbaf4ba2d1ad2ef39a; GitHub main and public Render exact SHA verified. Eighteen tests and root lint/build pass. Local browser checked multi-selection/save/reload; public browser checked Bathroom selection/deselection without navigation, inline custom selection, same-page Add success, reload persistence and archive. Verification task archived without completion. User tab 7 is left on Bathroom activities; no required work remains.

## Room-first task picker

Add task now opens a room chooser, then room-specific activities, then task details. User confirmed Dishes belongs inside Kitchen. Kitchen offers Dishes/Counters/Sink/Stove/Floor; Bathroom offers Toilet/Sink/Shower or tub/Mirror/Floor; Bedroom and Living area have their own suggestions. Existing active rooms and custom rooms/tasks are supported. Suggested rooms are drafts: room and task save atomically only on Save task; cancel/back creates no records. Existing active rooms are reused case-insensitively. Archived rooms are not silently restored. Add task works even with no spaces. Edit task retains its direct form. No schema/storage-key or routine change. Implementation and 18 tests complete; Released at bdcba1cbf2c19f576c7bf179e7453d0e6e9faf9d; GitHub main and public Render exact SHA verified. Public browser verified Bathroom choices, Kitchen → Dishes → details, Back/Cancel, custom-room entry, save/reload and active Kitchen reuse. Verification task was archived without completing it; no cleaning history added. Eighteen Cleaning tests plus root lint/build pass. Kitchen choices are left open. No required work remains.

## Room routines (2026-10-20)

Each physical cleaning space now has an optional reusable ordered routine, separate from scheduled tasks. Today shows room entry cards; Spaces offers Build/Edit routine (one step per line) and Start/Continue. A visit snapshots the room name and steps, saves each sequential completion, supports Undo last step and pause/reload, and requires all steps before Finish. Finish records the visit in History; starting again resets the entire checklist, including on the same day. Edits affect future visits, preserving in-progress/history snapshots. Archives retain routines and visits. Browser-only persistence and existing task schedules remain unchanged. Sixteen Cleaning tests and lint/build pass; local browser verified. Released at b8b20303fd2d256ac6c0efcc2f32795cebab8100: GitHub main and public Render exact build SHA verified. Public browser verified editor/start, sequential completion, reload/resume, finish/history snapshots, fresh same-day restart, archive retention, backup download/import and hallway return. Labeled test space is archived; one clearly labeled test visit remains in History. Sixteen Cleaning tests and root lint/build pass. No required work remains; browser-only storage is still disclosed.

## Cleaning room (2026-10-20)

Current authorized work: personal Cleaning first, eventually the user's own business. First slice is routines and completion history with backups. Released and personally verified on public Render at 2d80a9c. No required follow-up in this slice. Clients/properties, quotes, invoices and cloud identity are future decisions.

- 2026-10-19 workspace migration complete: implementation d5e140e on main/public Render, signed-in parent → room → Jobs → More → Inventory account check → parent verified. Existing session and seven jobs remain; return/header visible while scrolled. Root README is the ownership/command map. Separate package/source/build/tests and root gateway/commands are implemented. Full room suite, focused auth/location, hallway/gateway, lint/build and production security checks pass. Follow-up preserves legacy hash changes on an already open hallway. Shared cross-app identity and additional rooms remain future work; native-device validation remains separate.

- 2026-10-18 software hallway complete at 2bce1ca: GitHub main/public Render SHA and signed-in menu → Route Manager → Jobs → menu verified, including visible controls, account identity, return focus and removal of room navigation/assistant. Three shell tests/lint/build and local browser Back/Forward pass. Route Manager is the first room; more rooms are future work. Shared authentication/backend remains; this is frontend/lifecycle separation.

## Current non-iOS work (reviewed 2026-10-10)

- 2026-10-17 navigation follow-through complete at 514e516: shared address-preferred job links, planned starting point and rough-estimate label. Twenty-seven tests/lint/build pass; live Maps Bike/Walk/Drive correct destination/mode/start and second-leg origin verified. Saved-pin accuracy for approximate planning remains separate. Scan setup verified; physical capture/stitching remains untested and Test Lab stays development-only.

- Inventory account-sync slice deployed: GitHub main and public Render build-info confirm bc4cc64. Migration 0008, rollback SQL, 51 focused tests, lint/build and disposable server checks pass. Signed-in validation is blocked by browser Transport closed; resume account loading/retry/selector/header checks when access recovers. Jobs and standalone Proof Vault remain separate; next durability work is Proof Vault media, plus inventory archival/conflict review and physical-device photo checks.

- Latest user focus: connect existing app features. Proof Vault empty/history entry and selected-job Preview Guide/Scan/Inventory shortcuts deployed and signed-in verified at efad8a3. Twenty-three relevant tests plus lint/build pass; shortcuts stay visible in the fixed footer. Procedure/closeout engines are retained but their old UI was deliberately retired. Future UI decisions should preserve the simple popup and establish a separate reachable workflow if requested.

- Check-in account-lifetime fixes implemented: 22 focused tests, disposable production-bundle account isolation checks, lint and build pass. Deployed to main/Render at c8747d1; signed-in reload, Retry account sync, GET 200 JSON, Saved status, pending=false and zero pending records verified. Earlier normal Saved/pending=false acknowledgment and browser access are now verified.
- Next development: finish live Phase 1 scheduling interactions, then approved weather/air-quality and voice summary phases. Inventory custody sync and its explicit per-job legacy import are implemented in the current slice; migration of other legacy browser features remains unimplemented.
- Infrastructure: durable proof files, database-atomic quotas before replicas, retention/archival, the unpatched build-tool chain and inaccessible legacy Sites publication. Preserve existing data.
- Access-dependent checks: physical iPhone camera/PWA/Preview Guide/procedure flows and separate ordinary-account production login. Automatic CE recognition requires a supported receipt/API contract. BlueAI stays paused. Native iOS work is excluded.

This current list supersedes older pending release/access statements below; retain dated entries as history.

## BlueAI follow-through (2026-10-01)

The production integration owner and two legacy-test synthetic rows have been corrected to the newer signed-in account. Completed 2026-10-02: personally verified both synthetic records and successful sync in production Jobs. No further debugging is needed for this visibility issue. Do not alter Barrister records. Supabase-backed export storage is already implemented, superseding the older priority below to provision a private data directory for this path. Render is the production target requested by the user.


## High

- **Active (2026-10-05):** Finish Diagnostics as the agreed side task, then identify the authenticated probation 404 from method/origin/status/content-type/auth/build evidence. Absolute URLs are deployed but do not establish the cause or resolution. Continue afterward with CE signed-in verification, real-device proof, sync races/account switches, ordinary-account isolation, automatic recognition brainstorming, then iOS Capacitor wrap. BlueAI remains paused.

- Completed: production account saving/reload, second-browser loading, and approved Admin activation/screens. Required Render settings already existed; no secrets were changed.

- Remediation is deployed and verified. Remaining work in this slice: official embedded CE submission, provider completion recognition, real-device proof checks, in-flight sync races, and a separate ordinary-account isolation exercise.

- Completed: required Admin/probation tables and atomic RPC are installed; Admin access was explicitly approved and verified.

- Configure BlueAI's server-only token, owner UUID and persistent private data
  directory, then verify a real sender create/update in the signed-in calendar.
  The current Render free configuration has no disk; leave the receiver disabled
  until durable storage is available. See `features/blueai-ingestion.md`.

- Complete the final signed-in Render verification: the Blueprint is deployed,
  the public sign-in page loads, and `/api/health` passes at
  `https://route-manager-phtj.onrender.com`. Verify authentication, protected
  API calls, and the signed-in mobile app before retiring Railway as the
  temporary rollback host.

- Add server-side Supabase bearer-token validation to protected Cloudflare
  Worker routes so Worker deployments enforce the same authentication boundary
  as Express; track as P011.

- Continue named Today-screen panel reviews against the simplified dashboard stack. The removed inline Preview/Ride Mode readiness panel and Travel Plan panel should not be reintroduced unless explicitly requested.

- Verify the AIØ three-tab redesign (Today/Jobs/More) in the live signed-in app on a real device: simplified Today stack (weather artwork, This Week calendar, Next Best Jobs, Today's Other Jobs), live-weather slot (day sun / night moon, temperature, condition, feels-like, and the offline/denied fallback), Next Best Job actions, weekly strip + expanded day panel, Jobs schedule list, More hub navigation, and the jobs-count badge. Headless layout verification (320/390/430 px, dark/light, no overflow) is done via `scripts/screenshot-today.mjs`; the signed-in production pass remains.

- Complete real iPhone Safari/Home Screen PWA verification of Preview Guide using a real slow-scroll recording, including codec decode, seek order, cancellation/recovery, storage pressure, camera preparation photo, explicit trip handoff, and arrival persistence.

- Finish Phase 1 scheduling verification: confirm weekly strip + expanded day panel + move-to-day flows work end-to-end in the live production app (move today/future/remove, overdue + unscheduled review, migration of any legacy moved-tomorrow data), then update the ADR and mark the phase complete.
- Implement Phase 2 scheduling (weather + air-quality analysis in the weekly strip / expanded day panel) and Phase 3 (TTS companion summary), per the approved roadmap.

- Add the authenticated durable inventory custody sync slice: server endpoint, append-only persistence, idempotent replay, attachment storage, and multi-device conflict policy. The current job-detail ledger is offline-first and intentionally remains queued until this is implemented.

- Continue the generic field-work procedure rollout: the Job Detail Procedure workspace now has mobile-validated ergonomics (scroll-to-step, current-step highlighting, quiet satisfied states, prominent blocking actions). Next: validate the complete Sonic technician flow end-to-end on a real phone (create job → assign procedure → open job → continue procedure → capture proof/serial → complete closeout), then add procedure-derived assignment/defaulting and additional customer-specific procedure data only after the generic proof/equipment/closeout loops are stable.


- Verify Smart Aisle Scan real-iPhone deletion/undo and lens cleanliness detection through `/real-device-verification?access=fuckyouleavemelone`: run Safari portrait/landscape and installed Home Screen PWA tests for immediate delete, undo restore, count update, automatic restitch, lens check result, recheck, false-warning avoidance, and capture blocking; collect the privacy-safe report plus screenshots or recording, and evaluate any failures before marking the feature fully verified.
- Verify Test Lab data isolation in the authenticated full app: local harness confirms cleanup preserves audit sessions, but production views still need a signed-in app pass.

## Medium

- Monitor Shower Gate cycle reset behavior in production.
- Monitor the monthly probation check-in reset, day-8 lock, device classification, and browser-local proof capacity in production.
- Gather user feedback on barcode scanning reliability.
- Test Smart Aisle Scan full-screen camera + 0.5x zoom on actual mobile device.
- Consider image compression before localStorage upload for scan photos.
- Expand automated Test Lab tests to include authenticated Settings entry and provider-controlled physical mobile camera capture when real-device service credentials are available.
- Calibrate lens cleanliness confidence thresholds with controlled smudge samples on a real device (P008).
- Verify Transit Mode against the live upstream quota during extended field use (stale-while-revalidate behavior, 429 handling, monthly budget consumption, exact plan stop offsets, and scheduled-vs-realtime timing). The audit and trip-stop accuracy remediations are implemented and need a signed-in production pass to confirm live behavior.

## Low

- If the Road Readiness concept returns, scope it as a separately requested feature rather than adding it back to the simplified main dashboard by default.

---

**Last Updated:** 2026-10-03 (Production 404 root cause identified — missing Render env vars; render.yaml fix deployed; dashboard config pending)

## 2026-09-26 release

Publish the approved local-only login identity, Monthly Check-In page, and simplified job popup. Verify the deployed commit plus public navigation; native iOS browser behavior requires separate device validation.
## Remediation status — 2026-10-02
This supersedes the earlier independent review findings for local code. Admin authorization trusts only app_metadata; client-editable metadata is denied. Account-scoped automatic loading/saving, visible sync failures/retry, and explicit legacy import are connected to the app. Migration 0007 atomically saves records and idempotent activity; stale proof/events are merged without erasing completion. Supabase tables and RPC are installed; rollback-only reliability tests passed. Local focused tests: 21 passed. Final deployment and signed-in account/Admin/cross-browser checks remain pending; no admin account is assigned. Provider recognition remains unimplemented.
## Live Render configuration check — 2026-10-03
Render Environment already contains SUPABASE_SERVICE_ROLE_KEY plus VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Server code supports the VITE values as fallbacks; separate URL/anon aliases are not required. No secrets were revealed or changed. Production reports 4c62ec5. Reloading the signed-in production check-in page and retrying sync shows no error; Render logs confirm authenticated GET requests reach the server. Record saving/reload is still unverified because the account cache has no current record and older shared records require ownership confirmation before import. Do not repeat migrations: both tables and the atomic RPC were installed and rollback-tested previously. Missing environment settings were a hypothesis, not a proven explanation of the earlier 404. Next confirm ownership of older browser check-ins, import only the user's own records, and verify account acknowledgment, reload, and matching database/activity rows. Admin assignment and cross-browser testing remain separate.
## Signed-in saving verified — 2026-10-03
User confirmed ownership of the older browser records and authorized import. The production UI acknowledged Saved to your account; after reload it retained the imported start event and account-save status. Supabase read-only verification found both imported months for the signed-in owner, with one activity entry per month: September has its pre-existing completion, October has a start event and remains incomplete. No fabricated completion or proof was created. This resolves the live single-browser save/reload verification blocker. Cross-browser loading and Admin activation/screens remain unverified. The legacy import prompt reappears after reload because the shared cache is intentionally retained; note for later UI cleanup, not a saving failure. Do not repeat migrations or change Render secrets: the service key was already configured and the VITE URL/anon fallbacks are supported.
## Admin activation and screens verified — 2026-10-03
After explicit action-time user confirmation, assigned server-controlled Admin to the signed-in account by merging app metadata; other metadata and credentials were preserved. Production Overview shows two records/two activity entries, Activity lists both, and Probation correctly separates completed September from pending October. Month filtering and record detail/event log were verified. Before activation the ordinary account received Admin access required. Fresh-login More discoverability and cross-browser account loading still require the user to sign in to the prepared Edge tab; browser input control detached repeatedly, so credentials were not entered. Do not claim these remaining checks are done.
## Fresh login and cross-browser verification complete — 2026-10-03
The user signed into the deployed app in Edge. A newly opened production tab loaded the same account's saved October start event and timestamp without local legacy import, confirming second-browser loading. More showed the actual authenticated account and Admin Portal entry; opening that entry loaded Overview with the expected two records/two activity entries. This closes the fresh-login discoverability and cross-browser loading blockers. The local development tab was a separate app; no credentials were read, reset, or copied. Browser input sometimes reported detached after a successful SPA navigation, so resulting DOM state was checked before any retry. Remaining follow-up coverage: in-flight save/account-switch races and a second ordinary-account isolation exercise. Do not confuse these with the now-verified main flow.
## Official CE launch remediation — 2026-10-03
The broken embedded login is replaced with Open Official CE Check-In on the existing in-app Monthly Check-In page. It uses the tracked launcher to open https://checkin.ce-connect.com directly, recording opened_ce and triggering account sync without marking completion. Return to Route Manager to attach proof and manually confirm a genuinely completed check-in. Provider authentication and submission happen on the provider's own origin, not through Route Manager. The old proxy returns 410 and no longer forwards cookies, rewrites forms, or removes provider framing protections. Automatic provider recognition remains unimplemented; do not confuse direct official-site access with independently verified completion.
Five focused navigation/launch/account tests, type-checking, and the production build pass. The change is prepared for Render automatic deployment; verify production build and signed-in launch/save before calling it live. Actual provider submission cannot be tested without a genuine user check-in; do not create a false completion. Real-device proof flow and concurrency/second ordinary-account isolation checks remain follow-up coverage.

## 2026-10-05 — Production evidence and acknowledgment
Diagnostics side task is deployed/live verified. Finish release verification of the reproduced stale pending acknowledgment; original 404 did not reproduce in Edge. Next remains real-device CE/proof verification and the established sequence; no speculative 404 fix or iOS sign-off.

## 2026-10-05 — Final release handoff
Resume at final d8d8ede acknowledgment UI/reload verification when production browser access works; do not repeat Diagnostics implementation or migrations. Then actual iPhone/CE proof and the recorded follow-up sequence. Public exact-SHA deployment and health are already verified.

## 2026-10-10 — Security scan remediation

13 findings verified against main; remediation committed and deployed to Render (cc3504e, followed by transit concurrency correction d223cbe). See [remediation and remaining verification](../../docs/SECURITY_SCAN_2026_10_10.md). Preserve the separate iOS draft. Production quotas must use durable Supabase accounting because Render local files are ephemeral. Legacy unowned records are quarantined rather than silently assigned or deleted. Multi-replica atomic quotas, ownership-confirmed legacy import, retention/archival and remaining dependency advisories require explicit follow-up.
