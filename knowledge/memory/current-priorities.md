# Current Priorities

## High

- Complete Smart Aisle Scan real-iPhone verification through `/real-device-verification?access=smart-aisle-iphone`: run Safari portrait/landscape and installed Home Screen PWA tests for removable thumbnails, photo review, automatic restitching, quality rejection, and level-guide behavior; collect the privacy-safe report plus screenshots or recording, and evaluate any failures before marking the feature fully verified.
- Verify Test Lab data isolation in the authenticated full app: local harness confirms cleanup preserves audit sessions, but production views still need a signed-in app pass.
- Verify deployed production reflects the Smart Aisle real-device verification route, PWA manifest/service worker, and build-info endpoint, and remains free of Smart Aisle Scan Test Lab UI.

## Medium

- Monitor Shower Gate cycle reset behavior in production.
- Gather user feedback on barcode scanning reliability.
- Test Smart Aisle Scan full-screen camera + 0.5x zoom on actual mobile device.
- Consider image compression before localStorage upload for scan photos.
- Expand automated Test Lab tests to include authenticated Settings entry and provider-controlled physical mobile camera capture when real-device service credentials are available.

## Low

- Add error monitoring (e.g., Sentry integration).

---

**Last Updated:** 2026-07-28 (smart-aisle-thumbnail-removal-quality-level)

