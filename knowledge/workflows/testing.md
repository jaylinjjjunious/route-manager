# Testing Workflow

## Available Commands

| Command | Purpose | Tool |
|---------|---------|------|
| `npm run lint` | Type-check the project | tsc --noEmit |
| `npm run build` | Build frontend and server | vite build + esbuild bundle |
| `npm test` | Run Vitest unit tests | vitest run |
| `npm run verify` | Lint + build combined | scripts/verify.cjs |
| `npm run test:habits` | Run habit UI check | node tests/habit-ui-check.cjs |
| `npm run test:smart-aisle-lab` | Run Smart Aisle Scan Test Lab browser check against local Vite harness | node tests/smart-aisle-test-lab-ui-check.cjs |
| `npm run checkpoint` | Annotated tag + lint + build | scripts/checkpoint.cjs |
| `npm run release` | Verify + commit + push | scripts/release.cjs |

## Testing Gaps

- Vitest covers the inventory custody ledger; UI and camera flows still require browser/device checks.
- **No integration tests** — API endpoints are not tested programmatically.
- **Limited browser checks** — Playwright is available for focused checks, but broad end-to-end coverage is not set up.
- Manual testing is required for camera, barcode scanning, upload flows, and real iPhone Safari/Home Screen PWA behavior. Smart Aisle Scan real-device evidence should be collected from `/real-device-verification?access=smart-aisle-iphone` and must include the copied privacy-safe report plus screenshots or screen recording when available.
- The Railway healthcheck at `GET /api/health` is the only automated runtime check.

## What Is Tested

- Habit tracker: `tests/habit-ui-check.cjs` validates UI state and rendering.
- Smart Aisle Scan Test Lab: `tests/smart-aisle-test-lab-ui-check.cjs` opens a local harness, clicks through practice setup, start capture, hold-for-burst, short tap, pointer cancel/lost-capture interruption, thumbnail review, remove confirmation, stable-ID removal, sequence recalculation, Reached the End stitching, the real-device verification report route, import processing, controlled scenarios, markers, diagnostics, cleanup, and verifies test cleanup preserves seeded audit data.
- TypeScript compilation: lint catches type errors across all source files.
- Inventory custody ledger: `tests/inventoryChain.test.ts` validates lifecycle chaining, local persistence, queueing, and tamper detection.
- Build: vite and esbuild confirm that the bundle produces valid output.

## Manual Testing Checklist

- Camera permission prompt on mobile
- Barcode scanning with real product
- Proof image capture and upload
- Shower Gate cycle reset at 6:00 AM
- Tab protection (locked tabs stay locked)
- Ride Mode navigation flow
- AI Dispatcher chat responses

## Railway Healthcheck

The deployment is monitored via a health endpoint:

```
GET /api/health
```

Returns 200 OK if the server is running.

---

**Last Updated:** 2026-07-29 (inventory-custody-first-slice)
