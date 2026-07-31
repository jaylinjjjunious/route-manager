# Known Bugs

## Active Issues

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| P001 | Medium | Proof images stored as base64 in D1 — not ideal for large files | Open |
| P002 | Medium | Express proof storage on ephemeral filesystem — lost on Railway restart | Open |
| P003 | High | No per-user data isolation — all proofs in single namespace | Open |
| P004 | Medium | No multi-user support — single-user localStorage bound | Open |
| P005 | Low | No automated tests for camera/barcode/upload flows | Open |
| P007 | Medium | Smart Aisle iPhone Safari/PWA real-device evidence is pending; direct automation is blocked until a controllable iPhone or provider credentials are available, and tester-assisted verification report is the current path | Open |
| P006 | Low | No error monitoring or alerting | Open |
| P008 | Low | Lens cleanliness detection may produce false uncertain results on naturally low-detail scenes (plain walls); controlled testing with real smudge samples is needed to calibrate confidence thresholds | Open |
| P009 | Low | Transit plan walk legs return placeholder board/exit coordinates because the upstream plan API does not expose coordinates on plan legs | Open |
| P010 | Low | Legacy jobs moved with the old "Move → Route B" control before Phase 1 scheduling shipped have no `scheduledDate`; they surface as unscheduled rather than pinned to a day until rescheduled | Open |


## Resolved Bugs

| ID | Description | Resolution |
|----|-------------|------------|
| R001 | Stale Supabase token handling for proof uploads | Fixed in c00bef0 |
| R002 | iPhone Safari camera lifecycle issues | Fixed in fed2945 |
| R003 | Shower Gate proof upload authorization failure | Fixed in b56c690 |
| R004 | Smart Aisle Scan Test Lab imported sequence crashed when the first photo had no overlap score | Fixed by filtering only numeric overlap scores before result averaging |
| R005 | Railway had `VITE_ENABLE_SMART_AISLE_TEST_LAB=true`, which could expose Developer Tools in production | Fixed with a dev-build-only production guard and production bundle verification |
| R006 | Smart Aisle capture button could enter text selection on long press and capture before the camera frame was ready | Fixed with burst capture controls that disable selection/touch callout behavior plus camera-readiness guards and live-practice harness coverage |

---

**Last Updated:** 2026-07-30 (phase-1-scheduling)

