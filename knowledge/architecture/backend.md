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
- `worker/index.ts` — Cloudflare Worker (700 lines)

## Related Knowledge

- `api/endpoints.md` — API contracts
- `api/authentication.md` — Auth middleware details
- `api/error-contracts.md` — Error response shapes
- `database/schema.md` — Database schema

## Last Updated

2026-07-20 (c12bd44)
