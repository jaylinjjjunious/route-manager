# API Error Contracts

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `src/services/apiClient.ts`, `server.ts`

---

## Standard Error Shape

All API endpoints return errors in a consistent JSON format:

```json
{
  "error": "Human-readable error message"
}
```

This shape is used by both the Express server and the Cloudflare Worker. The frontend `authFetchJson` function relies on this contract to extract error messages from failed responses.

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **400** | Bad Request | Missing required fields (e.g., no `cycleId` query param), incorrect barcode validation, malformed request body |
| **401** | Unauthorized | Missing or invalid JWT token (Express `requireAuth` middleware). Triggers automatic token refresh in `authFetchJson`. |
| **404** | Not Found | Proof or resource not found by ID (`GET /api/shower-proofs/:id` returns `{ proof: null }` or 404) |
| **405** | Method Not Allowed | HTTP method not supported on the requested endpoint |
| **503** | Service Unavailable | Database connection failure, D1 unavailable, or internal server error during query execution |

---

## Frontend Error Handling: `authFetchJson`

The `authFetchJson` function in `apiClient.ts` handles errors at multiple levels:

### 1. HTTP Status Errors
- Checks `response.ok` after the fetch call.
- If not OK, attempts to parse the response body as JSON.
- If the body contains `{ error: string }`, throws an `Error` with that message.
- If parsing fails, throws a generic error with the HTTP status code.

### 2. 401 Auto-Refresh
- On 401, refreshes the Supabase session.
- Retries the original request once.
- If the retry also fails with 401, throws an authentication error.

### 3. Network Errors
- Catches `TypeError` from `fetch()` itself (network offline, DNS failure, CORS block).
- Throws a descriptive network error message.

### 4. JSON Parse Errors
- If the response body is not valid JSON, throws an error indicating the response could not be parsed.

---

## Error Propagation Pattern

```
API returns { error: "Incorrect barcode" } with status 400
        ↓
authFetchJson parses JSON body
        ↓
Extracts "Incorrect barcode" from response.error
        ↓
Throws new Error("Incorrect barcode")
        ↓
Component catches error and displays to user
```

---

## Status Code Usage by Endpoint

| Endpoint | 400 | 401 | 404 | 405 | 503 |
|----------|-----|-----|-----|-----|-----|
| `GET /api/shower-proofs/current` | Missing cycleId | Token invalid | — | — | DB error |
| `GET /api/shower-proofs/:id` | — | Token invalid | Not found | — | DB error |
| `GET /api/shower-proofs` | — | Token invalid | — | — | DB error |
| `POST /api/shower-proofs` | Incorrect barcode / missing fields | Token invalid | — | — | DB error |
| `POST /api/dispatcher/chat` | — | Token invalid | — | — | Gemini API error |
| `POST /api/dispatcher/tts` | — | Token invalid | — | — | TTS error |
| `POST /api/import/ocr` | — | Token invalid | — | — | Gemini error |
| `GET /api/health` | — | — | — | — | — |
