# Testing Workflow

## Available Commands

| Command | Purpose | Tool |
|---------|---------|------|
| `npm run lint` | Type-check the project | tsc --noEmit |
| `npm run build` | Build frontend and server | vite build + esbuild bundle |
| `npm run verify` | Lint + build combined | scripts/verify.cjs |
| `npm run test:habits` | Run habit UI check | node tests/habit-ui-check.cjs |
| `npm run checkpoint` | Annotated tag + lint + build | scripts/checkpoint.cjs |
| `npm run release` | Verify + commit + push | scripts/release.cjs |

## Testing Gaps

- **No unit test framework** — Jest, Vitest, or similar is not configured.
- **No integration tests** — API endpoints are not tested programmatically.
- **No end-to-end tests** — Playwright or similar is not set up.
- Manual testing is required for camera, barcode scanning, and upload flows.
- The Railway healthcheck at `GET /api/health` is the only automated runtime check.

## What Is Tested

- Habit tracker: `tests/habit-ui-check.cjs` validates UI state and rendering.
- TypeScript compilation: lint catches type errors across all source files.
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

**Last Updated:** 2026-07-20 (c12bd44)
