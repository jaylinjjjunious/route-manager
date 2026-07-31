# Current Priorities

## High

- Add the authenticated durable inventory custody sync slice: server endpoint, append-only persistence, idempotent replay, attachment storage, and multi-device conflict policy. The current job-detail ledger is offline-first and intentionally remains queued until this is implemented.


- Verify Smart Aisle Scan real-iPhone deletion/undo and lens cleanliness detection through `/real-device-verification?access=smart-aisle-iphone`: run Safari portrait/landscape and installed Home Screen PWA tests for immediate delete, undo restore, count update, automatic restitch, lens check result, recheck, false-warning avoidance, and capture blocking; collect the privacy-safe report plus screenshots or recording, and evaluate any failures before marking the feature fully verified.
- Verify Test Lab data isolation in the authenticated full app: local harness confirms cleanup preserves audit sessions, but production views still need a signed-in app pass.

## Medium

- Monitor Shower Gate cycle reset behavior in production.
- Gather user feedback on barcode scanning reliability.
- Test Smart Aisle Scan full-screen camera + 0.5x zoom on actual mobile device.
- Consider image compression before localStorage upload for scan photos.
- Expand automated Test Lab tests to include authenticated Settings entry and provider-controlled physical mobile camera capture when real-device service credentials are available.
- Calibrate lens cleanliness confidence thresholds with controlled smudge samples on a real device (P008).
- Verify Transit Mode against the live upstream quota during extended field use (stale-while-revalidate behavior, 429 handling, and monthly budget consumption).

## Low

- Add error monitoring (e.g., Sentry integration).

---

**Last Updated:** 2026-07-30 (integrate-official-transit-api)

