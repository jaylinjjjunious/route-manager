# Known Bugs

2026-10-09 native navigation draft requires runtime validation. Hosted first-boot blocker prevents native visual/tap checks; Swift compilation is a separate gate. The website bridge depends on stable nav-tab IDs and modal markup; if controls are unavailable native navigation hides. Jobs count is shown in the native Jobs label, rather than the website red badge.

2026-10-09 live-site shell: native startup and retry remain unverified; the hosted simulator boot blocker below persists. Capacitor labels server.url for development, so production security/policy review is a release gate. Older successful artifacts contain the bundled app, not the new live-site shell.

## 2026-10-09 — Hosted simulator boot blocker

Run 37951706894 job 113891862701: native simulator compilation passed, but xcrun simctl bootstatus timed out after 240 seconds during Apple first-boot data migration, last reported plugin CoreLocationMigrator. App was never installed/launched; no screenshot exists. This is not evidence of an app startup failure. Successful prior compiled artifacts remain in run 37864986666 attempt 3. Do not repeat unchanged runs without new runtime evidence.

2026-10-09 supersedes the billing blocker below: Billing cleared, missing public Supabase client settings configured in Actions variables, and run 37864986666 attempt 3 simulator/archive builds and uploads pass. Native UI/device/signing validation remains pending.

## 2026-10-08 — iOS wrap blockers

Actions check 113604397557 reports a billing lock; Mac job did not start. Existing wrapper had invalid `iosScheme: https`, unsynced Browser plugin, API requests aimed at the local origin, and missing permission descriptions. Draft branch addresses these locally; native compile/device validation remains blocked. Native CORS is not deployed from this draft. See `docs/IOS_WRAP.md`.

Verified 2026-10-02 in the signed-in production Jobs page: BlueAI records synced; BLUEAI-TEST-001 appears under Assigned from BlueAI and BLUEAI-TEST-002 under Available from BlueAI. Application commit b690196 passed lint, production build, and 28 focused tests. No Barrister writes were performed. This verifies the receiver-to-UI path with existing synthetic data; a new real Barrister extraction was not run.

## BlueAI visibility investigation (2026-10-01)

Production's lazy App chunk contains BlueAI polling/display code; the earlier missing-bundle conclusion was false. Confirmed defects: disabled feeds silently stopped polling, failures were hidden, and record state was not cleared on account changes. The new owner-scoped feed hook and visible sync status address these defects. The deployed status confirmed account_mismatch: Render pointed at a legacy test account, and the newer signed-in account had no synthetic rows. The mapping and only the two legacy-test synthetic rows were corrected on 2026-10-01. Historical file-storage limitations below apply to legacy /jobs, not Supabase-backed /export and /records.


## Active Issues

### Independent Admin / probation review — 2026-10-02

Review target: deployed commit `45bd90612151c3060981febac72f2187de944b14`. Not cleared for production activation.

- **Critical authorization:** `server/admin/activityLog.ts:isAdmin` accepts `user.user_metadata.role` as well as server-controlled `app_metadata`. The frontend repeats this in `src/auth/AuthProvider.tsx`. User-editable metadata must not grant admin authority.
- **High persistence gap:** `syncToServer` and `loadFromServer` are only defined/exported by `useProbationCheckIn.ts`; no app/UI/startup calls were found. Current completion stays local in the normal flow. Both records and sync status use shared browser keys, so account switching is not isolated.
- **High merge gap:** `loadFromServer` overwrites nonempty unsynced local proof/verification/event fields with server values and marks records synced without checking local dirty state. Server upserts also have no revision/conflict check.
- **High audit gap:** `logActivity` failures are returned but ignored by probation routes, allowing successful save responses without activity. Inserts use fresh IDs and no idempotency key; retry/sync can duplicate events. Client-supplied `provider_verified` is accepted without provider receipt validation.
- **Activation / verification blocker:** Supabase REST returns 404 / PGRST205 for both required tables; dashboard SQL execution was blocked by browser timeouts. The current signed-in app has no Admin entry and `#admin` displays “Admin access required.” Table/role setup and true cross-browser persistence are not verified.

Build and 11 focused probation tests passed, but those tests cover policy/navigation/rendering rather than the new security/persistence/logging contracts. No runtime fix or database change was made during this review.

Validation baseline observed 2026-09-27: the full suite has two failures in
unchanged tests/components. `aioHeaderProfile.test.ts` expects Authenticated
while its auth mock supplies no session (the component shows Local-only mode).
`monthlyCheckInSettings.test.ts` searches for a Check In Now button that the
current panel no longer renders. Both reproduce in an isolated run. Lint,
build and the five new BlueAI tests pass; commit/push is held by the repository
failed-check rule until these unrelated test baselines are repaired.

BlueAI v1 operational limitation (2026-09-27): receiver code and automated
tests exist, but actual sender delivery and signed-in production visibility
are pending configuration/access. The current Render free service has no
persistent disk. v1 requires one Express process with persistent storage;
it is not a multi-replica or bidirectional job-sync system.

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| P001 | Medium | Proof images stored as base64 in D1 — not ideal for large files | Open |
| P002 | Medium | Express proof storage on ephemeral filesystem — lost on Railway restart | Open |
| P003 | High | No per-user data isolation — all proofs in single namespace | Open |
| P004 | Medium | No multi-user support — single-user localStorage bound | Open |
| P007 | Medium | Smart Aisle iPhone Safari/PWA real-device evidence is pending; direct automation is blocked until a controllable iPhone or provider credentials are available, and tester-assisted verification report is the current path | Open |
| P008 | Low | Lens cleanliness detection may produce false uncertain results on naturally low-detail scenes (plain walls); controlled testing with real smudge samples is needed to calibrate confidence thresholds | Open |
| P010 | Low | Legacy jobs moved with the old "Move → Route B" control before Phase 1 scheduling shipped have no `scheduledDate`; they surface as unscheduled rather than pinned to a day until rescheduled | Open |
| P011 | High | Cloudflare Worker API routes do not validate Supabase bearer tokens even though the Express deployment uses `requireAuth()`; client token injection alone does not protect Worker endpoints | Open |
| P012 | Medium | Admin Portal requires online connection — no offline queue for admin actions | Open |
| P013 | Medium | Only probation check-in connected to Admin Portal; jobs, inventory, proofs remain in separate UIs | Open |
| P014 | Low | No granular admin permissions (view vs edit vs delete) — single admin role | Open |
| P015 | Low | Activity log not user-facing — regular users cannot see their own activity timeline | Open |
| P016 | Medium | Admin schema activation | Resolved: tables and atomic RPC applied and live records verified |
| P017 | High | Authenticated probation sync 404 after external CE launch | Open: absolute URLs and temporary logging were deployed, but root cause/post-return signed-in behavior remain unverified. Complete Diagnostics and capture request evidence before another fix. |


## Resolved Bugs

| ID | Description | Resolution |
|----|-------------|------------|
| R001 | Stale Supabase token handling for proof uploads | Fixed in c00bef0 |
| R002 | iPhone Safari camera lifecycle issues | Fixed in fed2945 |
| R003 | Shower Gate proof upload authorization failure | Fixed in b56c690 |
| R004 | Smart Aisle Scan Test Lab imported sequence crashed when the first photo had no overlap score | Fixed by filtering only numeric overlap scores before result averaging |
| R005 | Railway had `VITE_ENABLE_SMART_AISLE_TEST_LAB=true`, which could expose Developer Tools in production | Fixed with a dev-build-only production guard and production bundle verification |
| R006 | Smart Aisle capture button could enter text selection on long press and capture before the camera frame was ready | Fixed with burst capture controls that disable selection/touch callout behavior plus camera-readiness guards and live-practice harness coverage |
| R007 | Transit trip plans silently used the first/last stops of an entire route as the rider's boarding/exit stops | Fixed by using plan offsets/schedule items when present and exposing exact/inferred/unavailable confidence with honest UI warnings |
| R008 | No automated tests for camera/barcode/upload flows (P005) | Added `tests/cameraLifecycle.test.ts`, `tests/showerProofUpload.test.ts`, and `tests/errorReporter.test.ts`; transit provider test now mocks Supabase so it runs without env vars |
| R009 | No error monitoring or alerting (P006) | Self-hosted privacy-safe client reporter (`src/services/errorReporter.ts`) + authenticated `POST /api/errors` (`.local-error-reports/`) + Debug Center toggle/test button |
| R010 | Date-only scheduling shifted one day backward when tests or server tooling ran outside the Los Angeles system timezone | `addDays` and `formatScheduledDate` now use UTC calendar math for `YYYY-MM-DD` values; timezone conversion remains limited to real instants |
| R011 | Railway production build could not load `@tailwindcss/postcss` when development dependencies were omitted | Moved the required build plugin into production dependencies |

---

**Last Updated:** 2026-10-03 — 404 on probation sync after external CE launch fixed by absolute API URLs in synchronize() (commit db71f44)

## 2026-09-26 release review

Fixed duplicate provider launch in the new monthly page and restored navigation gating in the simplified job popup. Added Render commit identification. Native Capacitor browser interaction remains unverified on a real iOS device. The retired job popup workflow controls are intentionally unavailable by user decision.

Release verification also corrected the synthetic local user's misleading Authenticated label and password-change form; both now require a real session.
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
## Scope audit — 2026-10-03
Completed and live-verified: in-app reminder navigation; ownership-confirmed account import; save acknowledgment; reload; same-account Edge loading; database/activity persistence; explicitly approved server-controlled Admin role; Admin Overview/Activity/Probation, month filter, details, and More entry after fresh login. Lifeline startup integration and concise resume notes are installed and pushed.
Missing/incomplete: automatic official provider recognition (future implementation); embedded CE login/submission (real blocker); new provider-launch logging wiring; real-device screenshot attachment/capture verification; in-flight save/account-switch and second ordinary-account isolation checks. Proof/manual confirmation UI exists, but its complete real-device flow was not verified. Do not label the entire official check-in workflow finished.
Embedded blocker evidence: the deployed public sign-in HTML has a POST form whose action repeats the proxy prefix. server.ts registers only a GET proxy and rewrites form action URLs twice; provider session cookies are not relayed back to the client. Showing the official sign-in screen therefore does not establish a working submission. No actual provider credentials or check-in submission were used in this audit. Fixing this is a separate next task; no application code was changed during the audit.
Documentation was reconciled where current sections contradicted live results. Older dated review/migration notes are historical and superseded by this audit and the verified production snapshot.
## Official CE launch remediation — 2026-10-03
The broken embedded login is replaced with Open Official CE Check-In on the existing in-app Monthly Check-In page. It uses the tracked launcher to open https://checkin.ce-connect.com directly, recording opened_ce and triggering account sync without marking completion. Return to Route Manager to attach proof and manually confirm a genuinely completed check-in. Provider authentication and submission happen on the provider's own origin, not through Route Manager. The old proxy returns 410 and no longer forwards cookies, rewrites forms, or removes provider framing protections. Automatic provider recognition remains unimplemented; do not confuse direct official-site access with independently verified completion.
Five focused navigation/launch/account tests, type-checking, and the production build pass. The change is prepared for Render automatic deployment; verify production build and signed-in launch/save before calling it live. Actual provider submission cannot be tested without a genuine user check-in; do not create a false completion. Real-device proof flow and concurrency/second ordinary-account isolation checks remain follow-up coverage.

## 2026-10-05 — Production evidence and acknowledgment
P017 remains unverified on iPhone; Edge launch sync now returns GET/POST 200 JSON, no 404 reproduced. Separate reproduced bug: pendingSync true after acknowledgment/zero pending records; ref-before-status fix implemented, release validation pending. Initial production App bundle failure cleared after deployment/reload.

## 2026-10-05 — Final release handoff
Stale pending acknowledgment fixed and deployed at d8d8ede; regression/lint/build pass. Final UI/reload validation unavailable because production browser pages became blank after deployment. Prior authenticated launch requests returned 200 JSON, so original P017 cause remains unknown rather than proven resolved.
