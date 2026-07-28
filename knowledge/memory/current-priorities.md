# Current Priorities

## High

- Test Smart Aisle Scan Test Lab on an actual mobile device: Live Camera Practice with household objects, verify real camera workflow, overlay, animated start capture, hold-for-burst capture while moving, release-to-complete stitching, and long-press capture controls.
- Verify Test Lab data isolation in the authenticated full app: local harness confirms cleanup preserves audit sessions, but production views still need a signed-in app pass.
- Verify deployed production reflects the Smart Aisle animated start capture and hold-for-burst release-to-stitch update, and remains free of Smart Aisle Scan Test Lab UI.

## Medium

- Monitor Shower Gate cycle reset behavior in production.
- Gather user feedback on barcode scanning reliability.
- Test Smart Aisle Scan full-screen camera + 0.5x zoom on actual mobile device.
- Consider image compression before localStorage upload for scan photos.
- Expand automated Test Lab tests to include authenticated Settings entry and physical mobile camera capture when credentials/device access are available.

## Low

- Add error monitoring (e.g., Sentry integration).

---

**Last Updated:** 2026-07-28 (smart-aisle-hold-burst-release-flow)

