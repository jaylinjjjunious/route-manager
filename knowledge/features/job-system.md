# Job System

## Purpose

Job-based field work management system with proof vault, multiple job types, and statuses for tracking daily work activities.

## Current Implementation

### Job Types

| Type | Description |
|------|-------------|
| `retail_audit` | Retail location audits |
| `merchandising` | Merchandise placement/display |
| `mystery_shop` | Mystery shopping evaluations |
| `field_task` | General field tasks |
| `process_serve` | Document/process serving |

### Job Statuses

| Status | Description |
|--------|-------------|
| `ready` | Job is queued and ready to be completed |
| `revisit` | Job needs to be revisited |
| `under_review` | Job is under review (data still captured) |
| `completed` | Job has been finished |
| `pending` | Job is waiting to be scheduled |
| `postponed` | Job has been postponed |
| `outlier` | Job is outside normal route parameters (>4.2 miles) |

### Dashboard Route Job Details

Dashboard Today's Route cards open a `DashboardJobDetailSheet` bottom-sheet modal when the card surface is tapped. The sheet renders the shared `JobCard` component — the same card used on the Jobs tab — so the detail view is visually identical to the full job card. A compact route-info header shows the stop number, leg distance, and ride time from the previous stop. Footer actions include a Navigate button (opens Google Maps) and an "Open in Jobs" button (navigates to the Jobs tab). The sheet resolves the selected job from current app state by job ID, so each route stop shows its own live data. Existing card action controls (Navigate, Review, Move) stop event propagation and do not open the detail panel.

### Job Interface (src/types.ts)

```typescript
interface Job {
  id: string;
  storeName: string;
  address: string;
  coordinates: { lat: number; lng: number } | null;
  pay: number;
  estimatedMinutes: number;
  jobType: JobType;
  status: JobStatus;
  isCompleted: boolean;
  isRevisionRequired: boolean;
  priority: number;
  arrivalTime?: string;
  completionTime?: string;
  notes?: string;
  gpsCapture?: { lat: number; lng: number; timestamp: string };
}
```

## Scheduling (Phase 1 — per-job workday)

Every job can be pinned to a local workday with `Job.scheduledDate?: string` (`YYYY-MM-DD` in `America/Los_Angeles`, never a UTC timestamp).

### Rules

- **`effectiveDay(job, today)`** (src/features/jobs/jobSchedule.ts): a valid `scheduledDate` always wins; an *invalid* date is never coerced and returns `null` so it surfaces as Needs Review; an undated Route A job that is actionable (`ready`/`revisit`/`outlier`) or `under_review` derives `today` (derived only, never persisted). Undated Route B / inactive jobs have no effective day and surface through the unscheduled review list.
- **Moving jobs**: moving to a future day sets `routeId: 'B'` (standby); moving to today sets `routeId: 'A'` and triggers re-optimization. Moves are in place (same job object) — no duplicates; proof/inventory/notes/statusHistory are preserved.
- **Past dates are disallowed** in Move-to-Day (native `input type="date"`, `min` today, `max` today+365). Invalid stored dates → Needs Review, never silently coerced.
- **Today's Route pool** = Route A jobs with `effectiveDay === today` (includes under-review for visibility; `activeRouteAJobs`/next stop excludes them). Postponed jobs are excluded and surfaced via the unscheduled review list.
- **Midday rollover**: local date is recomputed on mount/focus/visibilitychange/60s tick; only derived filters change, no job mutation, and active rides are never silently re-sorted.
- **Overdue**: an active job (`actionable` or `under_review`) pinned to a date strictly before today is surfaced in the strip's overdue review — never auto-moved.

### Migration (schema v4)

`JOB_STATE_SCHEMA_VERSION = '4'` (src/features/jobs/jobState.ts). The legacy `jobs_moved_to_tomorrow` list is read once at boot and migrated into per-job `scheduledDate = tomorrow` + Route B. Completed/finished/under-review jobs are never rewritten. The legacy key is cleared only after a successful migrated write; there are no new writers.

### Grouping

`groupJobsByDay(jobs, today)` returns a 7-day `ScheduledDaySummary[]` (date, jobs, pay, workMinutes, reviewJobs) starting today — feeds the weekly strip and expanded day panel.

## Architecture

### Data Flow

```
User Input → JobModal → Job State (localStorage) → JobCard UI
                 ↓
          markComplete → GPS Capture → ProofVault
```

### Key Functions

- **markComplete**: Captures arrivalTime, completionTime, GPS coordinates; creates/updates ProofRecord in proofVault
- **Job Normalization**: jobState.ts handles schema versioning and normalization (schema version "2")

## Design Rationale

- **localStorage**: Single-user app, no need for complex persistence layer
- **Multiple statuses**: Different stages of job lifecycle require different handling
- **Proof vault integration**: Every completed job can have attached proof (photos, screenshots, receipts)
- **Outlier detection**: Jobs >4.2 miles from route are flagged for route efficiency analysis

## Dependencies

- localStorage for state persistence
- GPS API for coordinate capture
- File upload APIs for proof attachments
- routeUtils for distance calculations

## Business Rules

1. Jobs can only be marked complete with valid GPS coordinates
2. `under_review` jobs still capture arrival/completion times and GPS
3. `outlier` status is auto-detected when job is >4.2 miles from route
4. Revision insertion allows re-ordering jobs in the route
5. Proof vault is automatically opened after marking a job complete
6. Job priority affects route optimization order

## Security

- GPS coordinates captured only on user action (completion)
- Proof attachments stored locally (no server upload)
- No sensitive data transmitted

## Edge Cases

- **under_review jobs**: Data is captured even when status is under review
- **Outlier detection**: Jobs exceeding 4.2 mile threshold are auto-flagged
- **Revision insertion**: New jobs can be inserted at priority positions
- **Null coordinates**: Jobs may have null coordinates if GPS is unavailable
- **Same-day multiple completions**: Same job can be completed multiple times per day

## Failure Modes

- GPS unavailable → completion blocked with user prompt
- localStorage quota exceeded → state not persisted
- Proof attachment upload fails → job still completes (proof is optional)
- Schema version mismatch → jobState normalization handles migration

## Testing

- Manual test: Create job → complete → verify GPS capture → verify proof vault opens
- Test outlier detection with coordinates >4.2 miles apart
- Test job status transitions
- Test localStorage persistence across page refreshes

## Known Limitations

- Single-user localStorage only — no server sync for jobs
- No real-time collaboration
- No job data export/import
- No automated proof verification

## Future Improvements

- Server-side job persistence and sync
- Multi-user support
- Automated proof verification (OCR + validation)
- Job history analytics
- Route efficiency metrics from outlier data

## Related Source Files

- `src/App.tsx` — main app state, Dashboard Today's Route cards, compact route job detail panel, and handlers
- `src/types.ts` — Job type definitions (`scheduledDate`, `calendar`, `CalendarSourceMeta`)
- `src/features/jobs/jobState.ts` — schema normalization (v4) + `migrateJobSchedules`
- `src/features/jobs/jobSchedule.ts` — scheduling/migration/grouping helpers
- `src/features/jobs/WeeklyStrip.tsx` — 7-day scheduling strip on the dashboard
- `src/features/jobs/ExpandedDayPanel.tsx` — per-day detail panel (jobs, pay, plan, review)
- `src/features/jobs/MoveToDaySheet.tsx` — move-a-job-to-a-day bottom sheet/modal
- `src/features/jobs/JobCard.tsx` — job display component
- `src/features/jobs/JobModal.tsx` — job editing/completion modal (optional schedule field)
- `src/features/jobs/JobDetailModal.tsx` — scheduled row + Move-to-Day action
- `src/features/jobs/OutlierDetector.tsx` — outlier detection UI
- `src/features/jobs/JobsScreen.tsx` — jobs tab screen (list + filter + import)
- `src/features/jobs/RouteFilter.tsx` — route A/B filter component

## Related Knowledge

- [Shower Gate](./shower-gate.md) — prerequisite for job completion
- [Route System](./route-system.md) — route optimization with jobs
- [Proof Vault](./proof-vault.md) — proof attachment system

## Last Updated

2026-08-08 (phase-2-extraction: moved job UI, state, and scheduling into src/features/jobs/)
