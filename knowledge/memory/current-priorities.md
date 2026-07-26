# Current Priorities

## High

- Test Smart Aisle Scan Test Lab on actual mobile device: Live Camera Practice with household objects, verify real camera workflow, overlay, auto-capture, stitching.
- Verify Test Lab data isolation: test sessions must not appear in Today's Route, earnings, Under Review, Revisions, Finished.
- Verify feature flag `VITE_ENABLE_SMART_AISLE_TEST_LAB` hidden in production build.

## Medium

- Monitor Shower Gate cycle reset behavior in production.
- Gather user feedback on barcode scanning reliability.
- Test Smart Aisle Scan full-screen camera + 0.5x zoom on actual mobile device.
- Consider image compression before localStorage upload for scan photos.
- Add automated Test Lab tests (controlled scenarios, expected vs actual validation).

## Low

- Add error monitoring (e.g., Sentry integration).

---

**Last Updated:** 2026-07-26 (smart-aisle-scan-test-lab)
