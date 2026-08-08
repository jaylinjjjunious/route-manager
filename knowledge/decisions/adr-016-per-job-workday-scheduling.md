# ADR-016: Per-Job Workday Scheduling with Local Calendar Days

## Status

Accepted

## Context

Jobs could only live on Route A (active) or Route B (standby). Moving work to a later day relied on a single global `jobs_moved_to_tomorrow` list with no per-job date, no multi-day planning, no mid-day rollover handling, and no visibility of upcoming work. The Dashboard needed a weekly planning surface and a reliable definition of "today's route" that survives day boundaries.

Key constraints:

- Dates must represent a local workday for the rider (America/Los_Angeles), never drift via UTC parsing, and never be silently coerced when invalid.
- Moving a job must preserve the job in place (proof, inventory, notes, status history) — no duplicates.
- Today's route must not include future-dated work, and future work must not be re-optimized.
- Weather/AQ (Phase 2) and a TTS companion (Phase 3) are planned, so the data model and UI must be ready to grow.

## Decision

Add `Job.scheduledDate?: string` — the local workday `YYYY-MM-DD` in `America/Los_Angeles` (via `Intl.DateTimeFormat`, never `new Date('YYYY-MM-DD')`). Retain `Job.calendar?: CalendarSourceMeta` as snapshot metadata for future calendar imports; it never drives grouping.

- `effectiveDay(job, today)`: valid `scheduledDate` wins; invalid dates return `null` (Needs Review, never coerced); undated actionable/under-review Route A jobs derive today (never persisted).
- Moving to a future day sets `routeId: 'B'` (standby); moving to today sets `routeId: 'A'` and re-optimizes only today's executable pool.
- Today's Route pool = Route A jobs with `effectiveDay === today`. Route re-optimization and end-of-day rollover never touch future-dated jobs.
- Past dates are disallowed in Move-to-Day (native date input, min today, max today+365).
- Legacy `jobs_moved_to_tomorrow` migrates once at boot to `scheduledDate = tomorrow` + Route B (schema v4); the key is cleared only after a successful write; completed/finished/under-review jobs are never rewritten; no new writers.
- Companion widgets integrate into the Mission Control dashboard grid (no new tab).

## Alternatives Considered

- **UTC timestamp for scheduledDate** — rejected: UTC instants shift the rider's local day and complicate grouping and display.
- **Reuse `routeId` only (A/B)** — rejected: cannot represent "tomorrow" or multi-day planning without per-job state.
- **A separate scheduling store/tab** — rejected: scheduling is a Dashboard planning concern; a new tab fragments the Mission Control workflow.
- **Auto-advance invalid/past dates** — rejected: silent coercion hides data problems; invalid dates surface as Needs Review instead.
- **Route B as "this afternoon" and Route A as "today morning"** — rejected as the sole model in favor of explicit day pinning.

## Consequences

- `Job.scheduledDate` and `effectiveDay` become the single source of truth for day grouping; the dashboard weekly strip and expanded day panel render from `groupJobsByDay`.
- Benefits: multi-day planning, safe mid-day rollover (derived filters only), no duplicates, preserved per-job history, extensible to weather/AQ and TTS.
- Risks: legacy jobs without a `scheduledDate` rely on the Route A derived-today path (undated Route B jobs surface as unscheduled and must be rescheduled — see known-bug P010).
- Future impact: Phase 2 (weather/AQ analysis keyed by day) and Phase 3 (TTS companion summary) build directly on `ScheduledDaySummary`.

## Related Files

- `src/features/jobs/jobSchedule.ts` — scheduling/migration/grouping helpers
- `src/features/jobs/jobState.ts` — schema v4 + `migrateJobSchedules`
- `src/types.ts` — `Job.scheduledDate`, `Job.calendar`, `CalendarSourceMeta`
- `src/App.tsx` — today's pool, rollover effect, `handleMoveJobToDate`
- `src/features/jobs/WeeklyStrip.tsx`, `ExpandedDayPanel.tsx`, `MoveToDaySheet.tsx`
- `knowledge/features/job-system.md`, `knowledge/features/route-system.md`

## Date

2026-07-30

---

**Last Updated:** 2026-08-08 (phase-2-extraction: moved into src/features/jobs/)
