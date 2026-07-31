# Backend Architecture

## Purpose

Describes the Express server backend and the Cloudflare Worker API layer.

## Current Implementation

The project has two backend variants:

1. **Express server** (`server.ts`) — Deployed on Railway (primary production)
2. **Cloudflare Worker** (`worker/index.ts`) — Deployed via vinext/sites

### Express Server (`server.ts`, 724 lines)

#### Startup

```
server.ts → bootstrap()
  → Loads .env
  → If DEV: starts Vite dev middleware (vinext)
  → If PROD: serves dist/ static files
  → Listens on PORT (env) or 3001
```

#### API Routes

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/api/health` | No | Returns `{ ok: true, uptime, memory }` |
| GET | `/api/debug/auth-check` | No | Debug auth token introspection |
| GET | `/api/shower-proofs/current?cycleId=` | JWT | Returns current cycle proof or null |
| GET | `/api/shower-proofs/:id` | JWT | Returns proof by UUID |
| GET | `/api/shower-proofs` | JWT | Returns last 50 proofs for user |
| POST | `/api/shower-proofs` | JWT | Upload proof (multer, stores to disk) |
| POST | `/api/dispatcher/chat` | JWT | Gemini 2 chat for route advice |
| POST | `/api/dispatcher/tts` | JWT | Text-to-speech (Gemini/OpenAI/ElevenLabs) |
| POST | `/api/import/ocr` | JWT | Screenshot OCR via Gemini 2 |
| GET | `/api/transit/status` | JWT | Transit service + rate-limit + cache status |
| POST | `/api/transit/cache/clear` | JWT | Reset the in-memory transit cache |
| GET | `/api/transit/nearby-stops` | JWT | Nearby stops (lat, lon, radiusMeters, limit) |
| GET | `/api/transit/stops/:stopId/arrivals` | JWT | Live arrivals for a stop |
| POST | `/api/transit/trip-plan` | JWT | Plan a transit trip |
| GET | `/api/transit/alerts` | JWT | Active service alerts |

#### Transit Layer

The Express server proxies the official Transit API (Transit app v4) behind authentication. Mounted at `/api/transit` via `app.use("/api/transit", createTransitRouter(requireAuth))`. The upstream `TRANSIT_API_KEY` is a server-side env var only and is sent to `https://external.transitapp.com/v4` (configurable via `TRANSIT_API_BASE_URL`) as a literal `apiKey` header.

- `server/transit/transitApiClient.ts` — upstream client (apiKey header, HTTP/network error mapping, one retry on network failure)
- `server/transit/transitService.ts` — orchestration: fresh-cache-first, in-flight dedupe, bounded queue (8 / 45s), stale-while-revalidate, budget-gated stale fallback, normalizers (nearby radius clamped 100–1500 m)
- `server/transit/transitCache.ts` — in-memory TTL cache; expired entries retained so `getStale()` can serve them
- `server/transit/transitRateLimiter.ts` — sliding-window 5/min (per-minute free-tier budget) with release on network failure
- `server/transit/transitBudget.ts` — durable monthly budget guard (1,500/month, `America/Los_Angeles`, persisted to `.local-transit-usage/usage.json`), 70%/85%/95% thresholds, low-priority categories throttled first, `plan`/`arrivals` reserved; exposed via `getTransitBudgetStore()` (warmed at startup)
- `server/transit/transitTypes.ts` — canonical normalized models + raw upstream shapes
- `server/transit/transitRoutes.ts` — `createTransitRouter(requireAuth)` with per-code HTTP error mapping (400/404/429/502/503/500)

Error codes: `TRANSIT_NOT_CONFIGURED` (503), `TRANSIT_RATE_LIMITED` (429), `TRANSIT_MONTHLY_BUDGET_EXHAUSTED` (429), `TRANSIT_TEMPORARILY_UNAVAILABLE` (503), `TRANSIT_INVALID_LOCATION` (400), `TRANSIT_STOP_NOT_FOUND` (404), `TRANSIT_TRIP_NOT_FOUND` (404), `TRANSIT_AUTH_FAILED` (502).

#### Authentication Middleware

`requireAuth()` extracts Bearer token from Authorization header, calls Supabase `getUser(token)`, and attaches `req.user`. Returns 401 on invalid/expired token.

#### Proof Storage (Express)

Proof images are stored on the local filesystem under `local-shower-proofs/` directory. Served statically via Express at `/shower-proof-assets`.

#### Gemini Client

Lazy-init `getGeminiClient()` using `GEMINI_API_KEY` env var. Used for dispatcher chat and OCR.

#### TTS Providers

- **Gemini** — Default, uses `models/gemini-2-flash-001`
- **OpenAI** — Uses `tts-1` model
- **ElevenLabs** — Uses ElevenLabs API

### Cloudflare Worker (`worker/index.ts`, 700 lines)

#### Database

Uses Cloudflare D1 (SQLite via worker). Schema:

- `habit_state` — User habits with JSON columns
- `shower_proofs` — Legacy proof table (cycle_key PK)
- `shower_proof_records` — Current proof records with image_data_url

#### API Routes (Worker)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/shower-proofs/current` | Current cycle proof lookup |
| GET | `/api/shower-proofs/:id/image` | Serve proof image from data URL |
| GET | `/api/shower-proofs/:id` | Get proof by ID |
| GET | `/api/shower-proofs` | List proofs (50 max) |
| POST | `/api/shower-proofs` | Upload proof (FormData) |
| GET/POST | `/api/shower-proof?cycleKey=` | Legacy proof API |
| GET/PUT | `/api/habits` | Habit state read/write |
| POST | `/api/safety-news` | Google News RSS safety brief |
| GET | `/_vinext/image` | Image optimization |

#### Proof Upload (Worker)

Receives FormData with `barcode`, `image` (Blob), `cycleId`, `localDate`, `capturedAt`. Converts image to base64 data URL, inserts into `shower_proof_records`, returns the created record.

## Related Source Files

- `server.ts` — Express backend (724 lines)
- `server/transit/` — Transit API proxy layer (router, service, client, cache, limiter, budget, types)
- `worker/index.ts` — Cloudflare Worker (700 lines)

## Related Knowledge

- `api/endpoints.md` — API contracts
- `api/authentication.md` — Auth middleware details
- `api/error-contracts.md` — Error response shapes
- `database/schema.md` — Database schema
- `features/transit.md` — Transit Mode feature behavior

## Last Updated

2026-07-30 (integrate-official-transit-api)
