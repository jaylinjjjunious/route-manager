# ADR-D015: Backend-Proxied Official Transit API Integration

## Status

Accepted

## Context

The field app needs live bus/short-haul transit assistance (nearby stops, live arrivals, trip planning, service alerts) in Bakersfield. The official Transit API (Transit app v4) provides this on a free tier (1,500 requests/month, 5 requests/minute). The app already has an authenticated Express backend (Supabase JWT via `requireAuth`) and a pluggable routing-provider pattern in the frontend.

The key constraint: the Transit API key must never reach the browser, logs, or bundles. The app's existing API clients use bearer-token `authFetch`, and there is an established convention that sensitive credentials stay server-side.

## Decision

- Add a server-side Transit proxy layer under `/api/transit` (router → service → client → upstream), mounted with the existing `requireAuth` middleware so every call requires a valid Supabase token.
- Store `TRANSIT_API_KEY` in server env only. The frontend is gated by a public build-time flag `VITE_TRANSIT_PROVIDER=transit`; a `VITE_TRANSIT_API_KEY` variant must never exist (enforced by `tests/transitKeyHygiene.test.ts`).
- Normalize all raw upstream v4 responses server-side into canonical models (duplicated in `server/transit/transitTypes.ts` and `src/types.ts` by convention) before they reach the client.
- Enforce the free-tier budget server-side: sliding-window 5/min limiter, in-memory TTL cache, in-flight dedupe, bounded queue (8 max / 45s), and stale-while-revalidate so rate-limited requests still get stale data instead of errors.
- Add a durable monthly budget guard (`transitBudget.ts`, persisted to `.local-transit-usage/usage.json`) so the 1,500/month allowance survives restarts: per-category counting, 70%/85%/95% thresholds, low-priority categories (`alerts`, `networks`) throttled first, `plan`/`arrivals` reserved, stale-cache fallback when blocked, and a `monthly` diagnostic on `/api/transit/status`. Only upstream-reaching requests are counted (network-level failures never reached the server and are not charged).
- Clamp the nearby-stops search radius to the upstream maximum (100–1500 m, default 1000) in the server service and the frontend provider.
- Label walk legs honestly: trip-plan walk legs get `coordinatesAvailable: false` and are rendered as a walking-distance overview, never turn-by-turn directions, because upstream plan legs do not expose walking endpoint coordinates. Stops without coordinates are marked incomplete and excluded from trip planning instead of silently using `0,0`.
- Choose `transitApiProvider` (live) over `mockProvider` over `googleRoutesProvider` (which throws for transit methods by design).

## Alternatives Considered

- **Direct browser calls to the Transit API** — rejected: would leak `TRANSIT_API_KEY` into the client bundle.
- **Google Routes provider as primary transit source** — rejected for the official integration: paid quota and no free local-transit equivalent for Bakersfield; kept only as the routing fallback.
- **Enforcing rate limits client-side only** — rejected: multiple devices/sessions would exceed the shared monthly quota; the server must own the budget.
- **Persisting transit data (cache to disk/D1)** — rejected for this slice: in-memory cache is sufficient for the app's request volume; revisit if volumes grow.

## Consequences

- Benefits: key security, unified auth, normalized contracts, resilience to the 5/min limit (stale-while-revalidate + queue), and no per-device quota management.
- Tradeoffs: every transit call costs a server round trip; the in-memory cache resets on restart; the monthly counter is a local estimate (not the provider's official billing meter) and is separate per deployment instance — a multi-instance deployment should share storage before the quota matters; free-tier monthly quota (1,500 req) is the hard ceiling with no automatic paid fallback.
- Risks: upstream contract changes require normalizer updates (raw shapes are pinned in `transitTypes.ts`); no automated live-API integration test — upstream contract was verified by hand probes; the Bakersfield network id (`GET|Bakersfield`) still awaits live verification via coordinate-based discovery.

## Related Files

- `server/transit/` — proxy layer (routes, service, client, cache, limiter, budget, types)
- `server.ts` — mounts `createTransitRouter(requireAuth)` at `/api/transit`
- `src/services/transit/` — provider selection, API client, favorites, format
- `src/components/transit/` — Transit UI components
- `knowledge/features/transit.md` — feature documentation
- `knowledge/api/endpoints.md` — endpoint contracts
- `tests/transit*.test.ts` — backend, hygiene, and provider-selection tests

## Date

2026-07-30

---

**Last Updated:** 2026-07-31 (transit-audit-remediation: monthly budget guard, 1500m radius clamp, honest walk-leg labeling)
