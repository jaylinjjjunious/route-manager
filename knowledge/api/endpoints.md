# API Endpoints Reference

**Last Updated:** 2026-10-02 (add admin portal, activity log, probation durable storage)
**Related Source Files:** `server.ts`, `worker/index.ts`, `server/transit/transitRoutes.ts`, `src/features/showerGate/showerProofApi.ts`, `src/services/apiClient.ts`, `src/services/transit/transitApiClient.ts`, `server/admin/probationRoutes.ts`, `server/admin/adminRoutes.ts`, `server/admin/auth.ts`, `server/admin/activityLog.ts`

---

## Overview

BlueAI Express endpoints (2026-09-27): `POST /api/integrations/blueai/jobs`
accepts one validated job using a dedicated machine bearer secret;
`GET /api/integrations/blueai/jobs` returns only the configured owner's feed
using the existing Supabase session. See [full payload, errors and setup](../features/blueai-ingestion.md).

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

### POST `/api/errors`

| Field | Value |
|-------|-------|
| **Auth** | Supabase Bearer token (`requireAuth`) |
| **Content-Type** | `application/json` |
| **Body** | `{ "reports": [{ message, category?, source?, pathname?, userAgent? }] }` (max 25) |
| **Response** | `{ ok: true, received: number }` |

Self-hosted client error reporting sink. Fields are sanitized and bounded server-side (message 300, category 40, source/pathname/userAgent 200 chars; control chars stripped; empty messages dropped). Records are appended to `.local-error-reports/reports.json` (capped at 200) with the owner's user ID. Returns `400 { error }` when no valid reports are provided and `500 { error }` on storage failure.

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

Plans a transit trip. `departureTime`/`arrivalTime` set `date`+`time` (arrive-by when `arrivalTime`). Returns the fastest result; `alternatives` counts extra returned trips. Transit ride legs include route metadata, scheduled/predicted Unix-second fields, `isRealTime`, and `stopSelectionConfidence` (`exact`, `inferred`, or `unavailable`). Exact boarding/exit stops come from upstream plan offsets and schedule items; fallback stops are explicitly labeled rather than silently presented as exact. TTL 3 min. Returns 404 `TRANSIT_TRIP_NOT_FOUND` when no route exists, 400 `TRANSIT_INVALID_LOCATION` for missing/out-of-range coordinates.

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

## POST /api/import/preview-summary

Authenticated selected-page extraction for the per-job Preview Guide.

- Auth: existing Supabase requireAuth Bearer session.
- Body: pages array with pageId, image, and mimeType; 1–12 image data URLs only.
- The endpoint does not accept a video or recording field.
- Total encoded selected-page payload is capped below the global 15 MB JSON limit.
- Response: structured title/time/pay when visible, beforeYouGo, whatYouWillDo, proofRequirements, warnings, referenceTopics, and uncertainItems.
- Every returned action item retains valid submitted source page IDs; items without valid source references are dropped.
- Errors use plain messages and server logs omit image data and extracted text.

## Build identification (2026-09-26)

GET /api/build-info is public and uncached. commitSha resolves RENDER_GIT_COMMIT, then RAILWAY_GIT_COMMIT_SHA, then GIT_COMMIT_SHA, otherwise local. Render is the primary Express host. builtAt currently falls back to response time when no Railway deployment timestamp is supplied; use commitSha for release identity.

---

## Domain: Probation Check-In (Durable Storage)

### GET `/api/probation-check-ins`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express `requireAuth`) |
| **Query Params** | None |
| **Response** | `{ records: ProbationCheckInRecord[] }` |
| **Error** | `{ error: string }` (401/500) |

Returns all probation check-in records for the authenticated user, ordered by month_key DESC (newest first).

---

### GET `/api/probation-check-ins/current`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express `requireAuth`) |
| **Query Params** | None |
| **Response** | `{ record: ProbationCheckInRecord \| null }` |
| **Error** | `{ error: string }` (401/500) |

Returns the current month's probation check-in record for the authenticated user, or null if not yet started.

---

### POST `/api/probation-check-ins`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express `requireAuth`) |
| **Content-Type** | `application/json` |
| **Body** | `ProbationCheckInPayload` (monthKey, startedAt?, completedAt?, device, verificationLevel?, proofName?, proofDataUrl?, providerReceiptId?, confirmationUrl?, confirmationMessageId?, events[]) |
| **Response** | `{ record: ProbationCheckInRecord }` |
| **Error** | `{ error: string }` (400/401/500) |

Creates or updates (upsert) a probation check-in record for the authenticated user. Uses `owner_id, month_key` as the conflict key. Returns the saved record with server-generated `updated_at`.

**ProbationCheckInPayload:**
```typescript
interface ProbationCheckInPayload {
  monthKey: string;                    // YYYY-MM format
  startedAt?: string;                  // ISO timestamp
  completedAt?: string;                // ISO timestamp
  device: "phone" | "tablet" | "computer";
  verificationLevel?: "self_confirmed" | "screenshot_documented" | "provider_verified";
  proofName?: string;
  proofDataUrl?: string;               // Base64 data URL (compressed)
  providerReceiptId?: string;
  confirmationUrl?: string;
  confirmationMessageId?: string;
  events: Array<{ type: "opened_ce" | "proof_attached" | "completed"; at: string; device: "phone" | "tablet" | "computer" }>;
}
```

---

### POST `/api/probation-check-ins/sync`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express `requireAuth`) |
| **Content-Type** | `application/json` |
| **Body** | `{ records: ProbationCheckInPayload[] }` |
| **Response** | `{ results: Array<{ monthKey: string; success: boolean; error?: string }> }` |
| **Error** | `{ error: string }` (400/401/500) |

Bulk sync multiple local probation check-in records to the server. Performs upsert per record. Useful for migrating from browser-only localStorage to durable server storage.

---

## Domain: Admin Portal

All admin endpoints require admin role authorization via `requireAdmin` middleware. The middleware validates the Supabase Bearer token and verifies `app_metadata.role === "admin"` or `user_metadata.role === "admin"`. Non-admin users receive `403 { error: "Admin access required.", code: "ADMIN_REQUIRED" }`.

### GET `/api/admin/overview`

| Field | Value |
|-------|-------|
| **Auth** | Admin JWT (Express `requireAdmin`) |
| **Query Params** | None |
| **Response** | `{ stats: { totalActivity, totalProbation, completedProbation, pendingProbation }, recentActivity: ActivityLogEntry[], recentProbation: ProbationCheckInRecord[] }` |
| **Error** | `{ error: string }` (401/403/500) |

Returns summary statistics for the admin dashboard: total activity log entries, total probation records, completed/pending counts, plus the 10 most recent activity and probation records.

---

### GET `/api/admin/activity`

| Field | Value |
|-------|-------|
| **Auth** | Admin JWT (Express `requireAdmin`) |
| **Query Params** | `limit` (default 100, max 500), `offset` (default 0), `feature`, `action`, `ownerId`, `from` (ISO date), `to` (ISO date) |
| **Response** | `{ activities: ActivityLogEntry[], pagination: { limit, offset, total } }` |
| **Error** | `{ error: string }` (401/403/500) |

Returns paginated activity log entries in reverse chronological order. Supports filtering by feature, action, ownerId, and date range.

**ActivityLogEntry:**
```typescript
interface ActivityLogEntry {
  id: string;
  owner_id: string;
  feature: string;
  action: string;
  related_record_type: string | null;
  related_record_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
```

---

### GET `/api/admin/probation`

| Field | Value |
|-------|-------|
| **Auth** | Admin JWT (Express `requireAdmin`) |
| **Query Params** | `limit` (default 50, max 200), `offset` (default 0), `ownerId`, `monthKey`, `completed` ("true"/"false"), `from` (ISO date), `to` (ISO date) |
| **Response** | `{ records: ProbationCheckInRecord[], pagination: { limit, offset, total } }` |
| **Error** | `{ error: string }` (401/403/500) |

Returns paginated probation check-in records across all users. Supports filtering by user, month, completion status, and completion date range.
