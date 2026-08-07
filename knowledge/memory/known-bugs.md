# Known Bugs

## Active Issues

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

---

**Last Updated:** 2026-08-03 (Worker authentication gap)

