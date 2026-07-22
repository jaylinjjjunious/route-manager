# API Overview

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `server.ts`, `worker/index.ts`

---

## Two Backend Variants

The All in One 667 runs two API backends:

### Express Server (`server.ts`)

- **Runtime:** Node.js
- **Deployment:** Railway (production), local development
- **Storage:** Local JSON file + `local-shower-proofs/` filesystem directory
- **Auth:** Supabase JWT via `requireAuth` middleware
- **Port:** Configured via `PORT` environment variable

### Cloudflare Worker (`worker/index.ts`)

- **Runtime:** V8 isolates (Cloudflare Workers)
- **Deployment:** Cloudflare Workers
- **Storage:** Cloudflare D1 (SQLite-compatible)
- **Auth:** None at middleware level
- **Bindings:** `DB` (D1 database)

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Express (local) | `http://localhost:3000` |
| Express (production) | `https://route-optimizer-app-production.up.railway.app` |
| Worker (production) | Cloudflare Workers domain (configured in `wrangler.toml`) |

---

## Content Types

| Request Type | Content-Type |
|--------------|-------------|
| JSON body | `application/json` |
| File upload | `multipart/form-data` |
| Form fields (Worker) | `multipart/form-data` |
| TTS audio response | `audio/mpeg` or `audio/wav` |
| Image response | `image/jpeg` |

---

## General Conventions

- **All responses are JSON** except health check (JSON), TTS (audio stream), and image endpoints (raw image).
- **Error responses** follow the `{ error: string }` contract (see [error-contracts.md](./error-contracts.md)).
- **Timestamps** are ISO 8601 strings.
- **IDs** are UUIDs.
- **No CORS configuration** is documented — the Express server likely serves the React app from the same origin.
- **The Worker** is a standalone API, separate from the Express server.
- **Legacy endpoints** (`/api/shower-proof`, `/api/habits`, `/api/safety-news`) exist on the Worker only and do not require auth.
