# API Endpoints Reference

**Last Updated:** 2026-07-30 (integrate-official-transit-api)
**Related Source Files:** `server.ts`, `worker/index.ts`, `server/transit/transitRoutes.ts`, `src/services/showerProofApi.ts`, `src/services/apiClient.ts`, `src/services/transit/transitApiClient.ts`

---

## Overview

The All in One 667 exposes two backend variants:

1. **Express server** (`server.ts`) — local development and Railway production. Serves the React app and API.
2. **Cloudflare Worker** (`worker/index.ts`) — serverless edge API with D1 storage.

Both implement overlapping endpoints. The Express server requires JWT authentication on protected routes; the Worker does not enforce auth at the middleware level (client must still provide a token for auth-gated frontend logic).

---

## Domain: Shower Proofs

### GET `/api/shower-proofs/current`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) / No middleware auth (Worker) |
| **Query Params** | `cycleId` (string, required) |
| **Response** | `{ proof: ShowerProofRecord \| null }` |
| **Error** | `{ error: string }` (400 if cycleId missing, 503 on failure) |

Returns the most recent proof for the given cycle, ordered by `captured_at DESC`.

---

### GET `/api/shower-proofs/:id`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) / No middleware auth (Worker) |
| **Path Params** | `id` (string, UUID) |
| **Response** | `{ proof: ShowerProofRecord \| null }` |
| **Error** | `{ error: string }` (404 if not found, 503 on failure) |

Returns a single proof by its primary key.

---

### GET `/api/shower-proofs`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) / No middleware auth (Worker) |
| **Query Params** | None (Worker caps at 50 results) |
| **Response** | `{ proofs: ShowerProofRecord[] }` |
| **Error** | `{ error: string }` (503 on failure) |

Returns all stored proof records. The Worker limits results to 50.

---

### POST `/api/shower-proofs`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) / No middleware auth (Worker) |
| **Content-Type** | `multipart/form-data` |
| **Body Fields** | `barcode` (string), `image` (file, Express multer), `cycleId` (string), `localDate` (string), `capturedAt` (string) |
| **Worker Body** | FormData with same fields; image stored as base64 data URL in `image_data_url` |
| **Response** | `{ proof: ShowerProofRecord }` |
| **Error** | `{ error: string }` (400 for incorrect barcode or missing fields, 503 on failure) |

Uploads a shower proof. Express uses multer for file handling and stores files locally in `local-shower-proofs/`. Worker encodes the image as a data URL and stores it directly in D1.

---

### GET `/api/shower-proof` (Legacy)

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Query Params** | `cycleKey` (string) |
| **Response** | `{ proof: ... }` or `{ found: false }` |

Legacy endpoint on the Worker only. Uses `shower_proofs` table (not `shower_proof_records`).

---

### POST `/api/shower-proof` (Legacy)

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Content-Type** | `application/json` |
| **Body** | `{ barcode, cycleKey, ... }` |

Legacy endpoint on the Worker only. Writes to `shower_proofs` table.

---

### GET `/api/shower-proofs/:id/image`

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Response** | Raw image data (`image/jpeg`) |

Worker only. Serves the stored image data URL content for a proof record.

---

## Domain: AI Operations Assistant

### POST `/api/assistant/chat`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express via `requireAuth` middleware) |
| **Content-Type** | `application/json` |
| **Body** | `{ message: string, context: AppContext, history: Array<{role, text}> }` |
| **Response** | `{ response: string, toolCalls?: Array<{tool, input, confirmationText}> }` |
| **Runtime** | `server.ts` (Express), mounted at line ~144 via `createAssistantRouter(requireAuth)` |

Sends a message to the AI Operations Assistant (Gemini 3.5 Flash). The assistant receives safe app context and conversation history. It returns a natural-language response and optionally a list of tool calls for the frontend to execute.

**Server file:** `server/assistant/assistantRoute.ts`
**System instructions:** `server/assistant/systemInstructions.ts`
**Client:** `src/assistant/assistantApi.ts` → `sendToAssistant()`

---

## Domain: Dispatcher (Legacy)

### POST `/api/dispatcher/chat`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) |
| **Content-Type** | `application/json` |
| **Body** | `{ message: string, jobs: Job[], currentBattery: number }` |
| **Response** | `{ response: string, action: DispatcherAction }` |

Sends a message to the legacy AI dispatcher endpoint. The standalone Route tab was retired, so this endpoint is not mounted through that page UI, but the backend contract remains available.

---

### POST `/api/dispatcher/tts`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) |
| **Content-Type** | `application/json` |
| **Body** | `{ text: string }` |
| **Response** | Audio stream (`audio/mpeg` or `audio/wav`) |

Generates text-to-speech audio for dispatcher responses.

---

## Domain: OCR Import

### POST `/api/import/ocr`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) |
| **Content-Type** | `multipart/form-data` |
| **Body** | `image` (file) |
| **Response** | Parsed job data extracted via Gemini Vision OCR |

Processes a screenshot image and extracts job/import data using Gemini's vision capabilities.

---

## Domain: Habits (Worker Only)

### GET `/api/habits`

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Response** | `{ ...habitState }` |

Returns the current habit state from the `habit_state` D1 table.

---

### PUT `/api/habits`

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Content-Type** | `application/json` |
| **Body** | Habit state object |
| **Response** | Updated habit state |

Updates the habit state in D1.

---

## Domain: Safety News (Worker Only)

### POST `/api/safety-news`

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Content-Type** | `application/json` |
| **Body** | Safety news payload |
| **Response** | `{ ok: true }` or `{ error: string }` |

Posts safety news data.

---

## Domain: Health & Debug (Express Only)

### GET `/api/health`

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Response** | `{ ok: true, uptime: number, memory: object, timestamp: string, version: string }` |

Health check endpoint. Returns server uptime, memory usage, current timestamp, and app version.

---

### GET `/api/debug/auth-check`

| Field | Value |
|-------|-------|
| **Auth** | None |
| **Response** | Auth debug info object |

Debug endpoint that returns current authentication state and configuration details.

---

## Domain: Transit (Express Only)

All routes are mounted at `/api/transit` via `createTransitRouter(requireAuth)` (see `server/transit/transitRoutes.ts`). Every route requires a Supabase Bearer token; unauthenticated calls return `401 { "error": "Authentication required." }`. The server proxies the official Transit API (v4) using `TRANSIT_API_KEY`; the key never reaches the client.

Error bodies use `{ error: string, code?: TransitErrorCode }`. Error code → HTTP status mapping:

| Code | Status |
|------|--------|
| `TRANSIT_INVALID_LOCATION` | 400 |
| `TRANSIT_STOP_NOT_FOUND` | 404 |
| `TRANSIT_TRIP_NOT_FOUND` | 404 |
| `TRANSIT_RATE_LIMITED` | 429 |
| `TRANSIT_MONTHLY_BUDGET_EXHAUSTED` | 429 |
| `TRANSIT_AUTH_FAILED` | 502 |
| `TRANSIT_NOT_CONFIGURED` | 503 |
| `TRANSIT_TEMPORARILY_UNAVAILABLE` | 503 |

### GET `/api/transit/status`

| Field | Value |
|-------|-------|
| **Auth** | JWT |
| **Query Params** | None |
| **Response** | `{ configured, provider, networks, rateLimit, cache, ttlSeconds, monthly, lastSuccessfulRequestAt, lastError }` |

Diagnostic status: whether the API is configured, the provider name (`transit-api`), configured network ids, sliding-window rate-limit state (`limit`, `used`, `remaining`, `windowStartMs`, `nextAvailableAtMs`, `pending`, `inFlight`), cache `size`/`capacity`, TTLs in seconds, durable monthly budget (`month`, `limit` 1500, `used`, `remaining`, `level`, `byCategory`, `estimated: true`), and last request/error metadata. Never returns 4xx/5xx on success; always 200.

### POST `/api/transit/cache/clear`

| Field | Value |
|-------|-------|
| **Auth** | JWT |
| **Content-Type** | `application/json` |
| **Body** | None |
| **Response** | `{ ok: true, size: number, capacity: number }` |

Resets the in-memory transit response cache.

### GET `/api/transit/nearby-stops`

| Field | Value |
|-------|-------|
| **Auth** | JWT |
| **Query Params** | `lat` (number, required), `lon` (number, required), `radiusMeters` (number, default 1000, clamped 100–1500), `limit` (number, default 10, clamped 1–25) |
| **Response** | `{ stops: TransitStop[], freshness: { source: "live"\|"cache"\|"stale", lastUpdatedAt, ageMs } }` |

Returns stops near a location sorted by distance, normalized from the upstream `nearby_stops` endpoint. TTL 5 min.

### GET `/api/transit/stops/:stopId/arrivals`

| Field | Value |
|-------|-------|
| **Auth** | JWT |
| **Path Params** | `stopId` (string, e.g. a `global_stop_id`) |
| **Response** | `{ stop: TransitStop \| null, arrivals: TransitArrival[], freshness: { source, lastUpdatedAt, ageMs } }` |

Live departures for a stop (up to 40, sorted by departure time). Times are Unix-epoch seconds (UTC); `isRealTime`/`isCancelled`/`isLast` flags included. TTL 45 s.

### POST `/api/transit/trip-plan`

| Field | Value |
|-------|-------|
| **Auth** | JWT |
| **Content-Type** | `application/json` |
| **Body** | `{ origin: { lat, lng }, destination: { lat, lng }, departureTime?: ISO string, arrivalTime?: ISO string }` |
| **Response** | `{ trip: TransitTrip, alternatives: number, freshness: { source, lastUpdatedAt, ageMs } }` |

Plans a transit trip. `departureTime`/`arrivalTime` set `date`+`time` (arrive-by when `arrivalTime`). Returns the fastest result; `alternatives` counts extra returned trips. TTL 3 min. Returns 404 `TRANSIT_TRIP_NOT_FOUND` when no route exists, 400 `TRANSIT_INVALID_LOCATION` for missing/out-of-range coordinates.

### GET `/api/transit/alerts`

| Field | Value |
|-------|-------|
| **Auth** | JWT |
| **Query Params** | `lat` (number, optional), `lon` (number, optional) |
| **Response** | `{ alerts: TransitAlert[], freshness: { source, lastUpdatedAt, ageMs } }` |

Active service alerts, normalized and sorted by severity (critical → warning → info). Without location it uses configured `TRANSIT_NETWORK_IDS`; with location it discovers nearby networks first. TTL 2 min.

### Frontend client

`src/services/transit/transitApiClient.ts` calls these endpoints through the app's authenticated `authFetch`. It throws `TransitClientError` carrying the server `{ error, code }`. Provider selection gates the UI on `import.meta.env.VITE_TRANSIT_PROVIDER === "transit"`; when the backend is not configured (503), the Tools tab shows a fallback callout instead of transit UI.

## Types

### ShowerProofRecord

```typescript
interface ShowerProofRecord {
  id: string;               // UUID primary key
  cycleId: string;          // Shower cycle identifier
  localDate: string;        // Local date string
  barcode: string;          // Full barcode value
  barcodeEnding: string;    // Last N characters of barcode
  capturedAt: string;       // ISO timestamp of capture
  storageKey: string;       // Storage location key
  imageUrl: string;         // URL or data URL to the image
  uploadStatus: string;     // Upload status (e.g. 'uploaded', 'pending')
  verificationStatus: string; // Verification status
  createdAt: string;        // Record creation timestamp
  updatedAt: string;        // Record last update timestamp
}
```

### Proof (Legacy)

```typescript
interface Proof {
  id: string;
  barcode: string;
  cycleKey: string;
  capturedAt: string;
  imageDataUrl?: string;    // Base64 data URL of image
  verified?: boolean;
}
```
