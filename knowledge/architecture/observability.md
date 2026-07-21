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

### Auth Debug

`GET /api/debug/auth-check` (unauthenticated): Tests token verification and returns user metadata or error details.

### Logging

- Express server console-logs request method, URL, and timing.
- `apiClient.ts` tracks per-request diagnostics.
- Errors are not pushed to an external monitoring service.
- No structured logging library is used.

### Known Limitations

- No error aggregation or alerting.
- No performance monitoring.
- No user-facing error reporting (beyond inline status messages).
- Debug Center is feature-rich but manually opened (not automatic on error).

## Related Source Files

- `src/components/settings/DebugCenter.tsx`
- `server.ts` — Health endpoint
- `src/services/apiClient.ts` — Request diagnostics

## Related Knowledge

- `memory/known-bugs.md` — Known issues
- `workflows/incident-response.md` — Incident handling

## Last Updated

2026-07-20 (c12bd44)
