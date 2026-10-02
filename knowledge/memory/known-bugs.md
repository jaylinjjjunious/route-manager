# Known Bugs

Verified 2026-10-02 in the signed-in production Jobs page: BlueAI records synced; BLUEAI-TEST-001 appears under Assigned from BlueAI and BLUEAI-TEST-002 under Available from BlueAI. Application commit b690196 passed lint, production build, and 28 focused tests. No Barrister writes were performed. This verifies the receiver-to-UI path with existing synthetic data; a new real Barrister extraction was not run.

## BlueAI visibility investigation (2026-10-01)

Production's lazy App chunk contains BlueAI polling/display code; the earlier missing-bundle conclusion was false. Confirmed defects: disabled feeds silently stopped polling, failures were hidden, and record state was not cleared on account changes. The new owner-scoped feed hook and visible sync status address these defects. The deployed status confirmed account_mismatch: Render pointed at a legacy test account, and the newer signed-in account had no synthetic rows. The mapping and only the two legacy-test synthetic rows were corrected on 2026-10-01. Historical file-storage limitations below apply to legacy /jobs, not Supabase-backed /export and /records.


## Active Issues

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

**Last Updated:** 2026-09-09 (Railway build dependency and timezone-independent scheduling fixes)

## 2026-09-26 release review

Fixed duplicate provider launch in the new monthly page and restored navigation gating in the simplified job popup. Added Render commit identification. Native Capacitor browser interaction remains unverified on a real iOS device. The retired job popup workflow controls are intentionally unavailable by user decision.

Release verification also corrected the synthetic local user's misleading Authenticated label and password-change form; both now require a real session.
