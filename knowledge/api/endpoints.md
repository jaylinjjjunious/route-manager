# API Endpoints Reference

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `server.ts`, `worker/index.ts`, `src/services/showerProofApi.ts`, `src/services/apiClient.ts`

---

## Overview

The Route Manager exposes two backend variants:

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

## Domain: Dispatcher

### POST `/api/dispatcher/chat`

| Field | Value |
|-------|-------|
| **Auth** | JWT (Express) |
| **Content-Type** | `application/json` |
| **Body** | `{ message: string }` (or similar chat payload) |
| **Response** | Chat response from Gemini model |

Sends a message to the AI dispatcher powered by Google Gemini.

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
