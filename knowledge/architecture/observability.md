# Observability

## Purpose

Describes debugging, logging, and monitoring capabilities.

## Current Implementation

### Debug Center

A full system diagnostics module accessible from Settings tab. Activated via `debugCenterOpen` state.

Features:
- Auth diagnostics (session, user, token)
- Shower proof state
- Route metrics
- Error logs
- Local storage inspector

### Health Endpoint

`GET /api/health` (unauthenticated):
```json
{
  "ok": true,
  "uptime": 12345,
  "memory": { "rss": 123, "heapTotal": 456, "heapUsed": 789 },
  "timestamp": "2026-07-20T...",
  "version": "1.0.0"
}
```

### Error Reporting (self-hosted)

Privacy-safe, self-hosted client error monitoring. No Sentry/third-party is used.

Client (`src/services/errorReporter.ts`):
- Registered in `src/main.tsx` at bootstrap (`initErrorReporting()`), after Supabase config is validated.
- Captures `window` errors, unhandled rejections, and explicit `reportError()` calls.
- Sanitizes and bounds every field (message 300, category 40, source/pathname 200 chars; control chars stripped; no file contents, secrets, or query strings).
- Batches in-memory (max 40, flush batches of 25) and flushes every 10s to authenticated `POST /api/errors`; also flushes on `visibilitychange` → hidden. Failed batches are re-queued.
- Opt-out persisted under `error_reporting_enabled` in localStorage (`setErrorReportingEnabled`); when disabled the queue is dropped.
- Every report is also written to the local Debug Store (`addDebugError`) so it shows under Debug Center → Recent Errors.
- Debug Center exposes the toggle and a "Send Test Error" button (`sendTestError`) that verifies the full path.

Server (`POST /api/errors` in `server.ts`):
- `requireAuth` (Supabase Bearer token); owner ID recorded.
- Validates `{ reports: [...] }` (max 25/batch), sanitizes fields, drops empty messages.
- Appends to `.local-error-reports/reports.json`, capped at 200 records.
- Returns `{ ok: true, received: n }` or `400 { error }`; 500 on storage failure.
- Ephemeral-filesystem storage only (same limitation as proofs) — no aggregation or alerting yet.

### Auth Debug

`GET /api/debug/auth-check` (unauthenticated): Tests token verification and returns user metadata or error details.

### Logging

- Express server console-logs request method, URL, and timing.
- `apiClient.ts` tracks per-request diagnostics.
- Errors are captured client-side by the error reporter described above.
- No structured logging library is used.

### Known Limitations

- Error reports persist only to the ephemeral Railway filesystem (`.local-error-reports/`); they are lost on restart and are not aggregated or alertable yet.
- No performance monitoring.
- Debug Center is feature-rich but manually opened (not automatic on error).

## Related Source Files

- `src/components/settings/DebugCenter.tsx`
- `src/services/errorReporter.ts`
- `server.ts` — Health + `POST /api/errors` endpoints
- `src/services/apiClient.ts` — Request diagnostics

## Related Knowledge

- `memory/known-bugs.md` — Known issues
- `workflows/incident-response.md` — Incident handling

## Last Updated

2026-08-03 (error-reporting)
