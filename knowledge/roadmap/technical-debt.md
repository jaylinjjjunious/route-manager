# Technical Debt

## High Impact

- **App.tsx is ~5837 lines** — Should be split into smaller, focused modules. This makes the file difficult to navigate and increases merge conflict risk.
- **No CI pipeline beyond Railway build** — No automated lint/test gates before deployment.
- **Single-user data model** — localStorage is bound to a single user. Multi-user requires a fundamental data architecture change.

## Medium Impact

- **Two backend variants (Express + Worker)** — Different auth models and API implementations. Maintenance overhead.
- **No TypeScript path aliases** — All imports use relative paths, which become fragile in deeply nested files.
- **Inline CSS-in-JS patterns alongside Tailwind** — Inconsistent styling approach.

## Low Impact

- **Proof images as base64 in D1** — Not efficient for storage or transfer.
- **Error reports are ephemeral and unaggregated** — Self-hosted client reporting exists (`src/services/errorReporter.ts` + `POST /api/errors`), but reports persist only to the Railway filesystem (`.local-error-reports/`) with no aggregation or alerting. A durable store or third-party service (e.g., Sentry) is the eventual path.
- **localStorage as primary data store** — Not synced across devices, lost on browser clear.
- **No input sanitization** — Acceptable for trusted users but limits future extensibility.

---

**Last Updated:** 2026-08-03 (error-reporting)
