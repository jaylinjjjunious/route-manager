# Current Priorities

## High

- Verify the AIØ three-tab redesign (Today/Jobs/More) in the live signed-in app on a real device: readiness hero, Next Best Job actions, Travel Plan, weekly strip + expanded day panel, Jobs schedule list, More hub navigation, and the jobs-count badge. Headless layout verification (320/390/430 px, dark/light, no overflow) is done via `scripts/screenshot-today.mjs`; the signed-in production pass remains.

- Complete real iPhone Safari/Home Screen PWA verification of Preview Guide using a real slow-scroll recording, including codec decode, seek order, cancellation/recovery, storage pressure, camera preparation photo, explicit trip handoff, and arrival persistence.

- Finish Phase 1 scheduling verification: confirm weekly strip + expanded day panel + move-to-day flows work end-to-end in the live production app (move today/future/remove, overdue + unscheduled review, migration of any legacy moved-tomorrow data), then update the ADR and mark the phase complete.
- Implement Phase 2 scheduling (weather + air-quality analysis in the weekly strip / expanded day panel) and Phase 3 (TTS companion summary), per the approved roadmap.

- Add the authenticated durable inventory custody sync slice: server endpoint, append-only persistence, idempotent replay, attachment storage, and multi-device conflict policy. The current job-detail ledger is offline-first and intentionally remains queued until this is implemented.


- Verify Smart Aisle Scan real-iPhone deletion/undo and lens cleanliness detection through `/real-device-verification?access=fuckyouleavemelone`: run Safari portrait/landscape and installed Home Screen PWA tests for immediate delete, undo restore, count update, automatic restitch, lens check result, recheck, false-warning avoidance, and capture blocking; collect the privacy-safe report plus screenshots or recording, and evaluate any failures before marking the feature fully verified.
- Verify Test Lab data isolation in the authenticated full app: local harness confirms cleanup preserves audit sessions, but production views still need a signed-in app pass.

## Medium

- Monitor Shower Gate cycle reset behavior in production.
- Gather user feedback on barcode scanning reliability.
- Test Smart Aisle Scan full-screen camera + 0.5x zoom on actual mobile device.
- Consider image compression before localStorage upload for scan photos.
- Expand automated Test Lab tests to include authenticated Settings entry and provider-controlled physical mobile camera capture when real-device service credentials are available.
- Calibrate lens cleanliness confidence thresholds with controlled smudge samples on a real device (P008).
- Verify Transit Mode against the live upstream quota during extended field use (stale-while-revalidate behavior, 429 handling, monthly budget consumption, exact plan stop offsets, and scheduled-vs-realtime timing). The audit and trip-stop accuracy remediations are implemented and need a signed-in production pass to confirm live behavior.

## Low

- Add error monitoring (e.g., Sentry integration).

---

**Last Updated:** 2026-08-02 (aio-three-tab-redesign)
