# Transit Mode (Official Transit API)

## Purpose

Native bus/short-haul transit assistance for the All in One 667 field app using the official Transit API (Transit app v4, free tier: 1,500 requests/month, 5 requests/minute). The integration is backend-proxied only: the server holds `TRANSIT_API_KEY`, the browser never sees it, and every `/api/transit/*` route is guarded by the existing Supabase `requireAuth` middleware.

## Key Facts

- **Upstream:** `https://external.transitapp.com/v4` (configured via `TRANSIT_API_BASE_URL`).
- **Auth:** literal `apiKey` request header (NOT `Bearer`). Set via `TRANSIT_API_KEY`.
- **Networks:** Bakersfield default is `GET|Bakersfield` (configurable via `TRANSIT_NETWORK_IDS`, pipe-separated).
- **Free tier:** 1,500 req/month, 5 req/min. The server enforces a sliding-window 5/min rate limiter, queues over-limit requests (bounded, 45s timeout), and serves stale cache data while rate-limited (stale-while-revalidate).
- **Frontend flag:** `VITE_TRANSIT_PROVIDER=transit` (public build-time flag) enables the Transit UI. `VITE_TRANSIT_API_KEY` must never exist.
- **Units from upstream:** stop `distance` in meters; plan `duration` in seconds; arrival/plan times are Unix-epoch seconds (UTC); plan start/end times are Unix-epoch seconds rendered as local 12h clocks.

## Current Implementation

### Server (`server/transit/`, mounted at `/api/transit` in `server.ts`)

- `transitTypes.ts` — canonical normalized models plus raw upstream shapes (duplicated from `src/types.ts` by convention since the server bundle cannot import client code).
- `transitApiClient.ts` — builds upstream URLs with `new URL(base + pathname)` (base carries the `/v4` path), sends the `apiKey` header, maps HTTP errors and upstream 200-with-error to `TransitApiError` codes, and retries once on network failure only.
- `transitCache.ts` — in-memory TTL cache with capacity; `get()` retains expired entries so `getStale()` can serve them (stale-while-revalidate). `POST /api/transit/cache/clear` resets it.
- `transitRateLimiter.ts` — sliding-window 5/min limiter with pending/in-flight accounting and `release()` on network-level failures.
- `transitService.ts` — orchestration: fresh-cache-first, in-flight dedupe (same key = shared promise), bounded queue (max 8, 45s wait), stale-while-revalidate background refresh, network-id resolution, normalizers (`normalizeArrivals`, `normalizeAlert`, `normalizeAlerts`, `normalizePlan` exported for tests), status aggregation.
- `transitRoutes.ts` — `createTransitRouter(requireAuth)` exposing the six endpoints (see `api/endpoints.md`).

### Frontend

- Provider selection: `src/services/transit/index.ts` → `isTransitApiEnabled()` returns true only when `import.meta.env.VITE_TRANSIT_PROVIDER === "transit"`. Provider order: `transitApiProvider` (live) → `mockProvider` (GET Bakersfield sample data) → `googleRoutesProvider` (throws for transit methods by design).
- `src/services/transit/transitApiClient.ts` — uses the app's authenticated `authFetch`; throws `TransitClientError` with the server error body.
- Hooks in `src/hooks/useTransit*.ts`: `useCurrentLocation`, `useNearbyTransitStops`, `useStopArrivals`, `useTransitAlerts`, `useFavoriteStops`, `useTransitStatus`, `useTransitTrip`.
- Favorites: `src/services/transit/favorites.ts` persists saved stops to localStorage (`transitFavoriteStops`).
- Components in `src/components/transit/`:
  - `NearbyStopsPanel` — current location, freshness badge, stops list with distance, expandable live arrivals, favorites toggles, "Plan a Transit Trip" button.
  - `StopArrivalsSheet` — bottom-sheet of live arrivals for a stop with route colors, real-time/cancelled indicators, and a "Plan from this stop" action.
  - `TransitPlannerSheet` — origin/destination planner that returns one trip with a walk-up boarding stop when available.
  - `FavoritesPanel` / `AlertsPanel` / `TransitToolsPanel` (Tools-tab wrapper with `isTransitApiEnabled()` fallback callout).
  - `TransitDashboardCard` — Dashboard quick-link to Tools when enabled.
  - `TransitStatusCard` — Settings diagnostic (configured flag, rate limit, cache, last error, clear-cache button).
  - `JobTransitSection` — inside the job detail modal: plans a trip from the previous stop (or `startCoord`) to the job and renders the `TransitTripCard`.

## Architecture

### Data Flow

```
Browser (VITE_TRANSIT_PROVIDER=transit)
  → src/services/transit/transitApiClient (authFetch + Bearer JWT)
  → /api/transit/* (server, requireAuth)
  → server/transit/transitService (cache → rate limiter → queue)
  → transitApiClient (apiKey header) → https://external.transitapp.com/v4
```

The JWT is validated server-side; the upstream `TRANSIT_API_KEY` never leaves the server.

### Cache TTLs

| Resource | TTL | Stale-while-revalidate |
|----------|-----|------------------------|
| Nearby stops | 5 min | Yes |
| Stop arrivals | 45 s | Yes |
| Trip plan | 3 min | Yes |
| Service alerts | 2 min | Yes |
| Network ids | 24 h | Via configured fallback |

## Business Rules

1. Transit UI is only rendered when `isTransitApiEnabled()` is true.
2. All transit data crosses the app as normalized models; raw upstream shapes stay server-side.
3. The server never blocks the request; over-limit requests are served stale data or queued (max 8, 45s) before returning 429.
4. Saved favorite stops are device-local (localStorage) and not synced.
5. Trip planning from a job uses the previous stop (or `startCoord`) as origin; the job's stored coordinates are the destination.

## Security

- `TRANSIT_API_KEY` exists only in server env (`process.env`), never `VITE_`-prefixed.
- `/api/transit/*` requires a valid Supabase Bearer token (`requireAuth`); unauthenticated calls return 401.
- Frontend never calls `external.transitapp.com` directly; the key-hygiene test suite (`tests/transitKeyHygiene.test.ts`) bans `VITE_TRANSIT_API_KEY`, scans for the real key in source, and blocks direct upstream URLs in `src/`.

## Edge Cases

- **Upstream plan returns HTTP 200 with `{"error": "..."}`** → treated as failure (Transit v4 returns 200-with-error for `fromPlace`/`toPlace` requests).
- **Rate limited with stale cache** → stale data served immediately, background refresh scheduled.
- **Rate limited with no cache** → request queued (8 max, 45s); queue full → 429.
- **Network failure** → one retry; if still failing the granted slot is released back to the limiter.
- **Invalid coordinates** → 400 `TRANSIT_INVALID_LOCATION`.
- **No transit route found** → 404 `TRANSIT_TRIP_NOT_FOUND`.
- **Not configured** (no `TRANSIT_API_KEY`) → 503 `TRANSIT_NOT_CONFIGURED`; frontend shows the Tools-tab fallback callout.

## Failure Modes

- 429 rate limit / monthly quota exhausted → stale data + queue, then 429; frontend shows a retry-friendly error.
- Upstream outage → 503 `TRANSIT_TEMPORARILY_UNAVAILABLE`; cached data still served if within stale window.
- Network-id discovery failure → falls back to configured `TRANSIT_NETWORK_IDS`.

## Testing

- `tests/transitCache.test.ts`, `transitRateLimiter.test.ts`, `transitNormalizers.test.ts`, `transitApiClient.test.ts`, `transitService.test.ts`, `transitFavorites.test.ts`, `transitKeyHygiene.test.ts`, `transitProviderSelection.test.ts` (see `workflows/testing.md`). Upstream calls are mocked; no live API traffic in tests.

## Known Limitations

- Free-tier quota (1,500 req/month) is the hard ceiling; no automatic provider fallback to Google Routes.
- Plans return walk legs with placeholder board/exit points (coordinates not exposed by upstream plan legs).
- Favorites are per-device only.
- No turn-by-turn voice guidance for transit legs.

## Future Improvements

- Google Routes fallback provider when the Transit quota is exhausted.
- Crowding / occupancy data when the upstream exposes it.
- Fare details enrichment.
- Multi-day or scheduled (arrive-by) trip previews in the planner UI.

## Related Source Files

- `server/transit/` — router, service, client, cache, limiter, types
- `server.ts` — mounts `createTransitRouter(requireAuth)` at `/api/transit`
- `src/services/transit/` — provider selection, API client, favorites, format, types
- `src/hooks/useTransit*.ts` — data hooks
- `src/components/transit/` — UI components
- `src/components/JobDetailModal.tsx` — `transitOrigin` prop + `JobTransitSection`
- `src/App.tsx` — Dashboard card, Tools tab, Settings diagnostic wiring

## Related Knowledge

- [Route System](./route-system.md) — the trip-planner and ride-mode surface that transit complements
- [Job System](./job-system.md) — jobs provide trip origins/destinations
- [Inventory Chain of Custody](./inventory-chain-of-custody.md) — the offline-first sibling pattern

## Last Updated

2026-07-30 (integrate-official-transit-api)
