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

### Job Detail Overview

`JobDetailModal` now opens with a compact Job Overview section before specialized panels. The overview answers what the job is, what matters now, what should happen next, and what is missing. It shows store/customer identity, address, schedule/due time, pay, lifecycle status/work state, a derived Next Action card, warning/blocker callouts, progress chips, lifecycle Time Summary, and quick operational controls. The Time Summary uses `summarizeJobTime` from lifecycle events/state, calculates active visits through now, always shows total onsite and active work time, and hides zero-value paused/support/blocked buckets. The Next Action is derived by `src/features/jobs/jobOverview.ts` from lifecycle state. The Arrive/Check In, Ready to Start, Blocked Before Start, Start Job, Pause/Resume, Await Support, Blocked Onsite, End Visit, and Work Complete buttons call `useJobs` lifecycle actions; blocker/support/end-visit flows use an in-modal note sheet instead of `window.prompt`. Work Complete closes the active visit/timing into `work_complete_pending_closeout`, keeps legacy `JobStatus` open, removes active-work controls, and surfaces a prominent Closeout action without running the full Closeout Gate yet. Visit History lists visit number, arrival, work start, end time, end reason, and the stable visit ID for later proof linking. Reopen remains intentionally unwired until the Closeout Gate pass. Transit, InventoryCustodyPanel, notes, process-serve details, Preview Guide, Smart Aisle Scan, admin controls, and the legacy status UI remain available below the overview.

### Job Interface (src/types.ts)

```typescript
interface Job {
  id: string;
  storeName: string;
  address: string;
  pay: number;
  estimatedMinutes: number; // Time spent inside store
  jobType: JobType;
  dueTime: string;
  notes: string;
  status: JobStatus;
  routeId: 'A' | 'B';
  coordinates: Coordinates;
  priority?: 'low' | 'medium' | 'high';
  isRevisionRequired?: boolean;
  isCompleted?: boolean;
  deadline?: string;
  revisionStatus?: string;
  statusHistory?: StatusEvent[];
  processServe?: ProcessServeDetails;
  captureMode?: 'single_photo' | 'manual_multiple' | 'smart_aisle_scan';
  scanSessionId?: string;
  scheduledDate?: string;
  calendar?: CalendarSourceMeta;
  inventoryDomain?: 'merchandising' | 'contract_parts';
  lifecycle?: JobLifecycleState;
  closeoutRequirements?: JobCloseoutRequirement[];
  procedureAssignment?: JobProcedureAssignment;
  procedureAssignmentHistory?: JobProcedureAssignmentHistoryEvent[];
}
```

### Closeout Gate Foundation

Jobs can carry generic `closeoutRequirements?: JobCloseoutRequirement[]`. The closeout engine in `src/features/jobs/jobCloseout.ts` is pure and React-independent. It supports requirement kinds `required`, `conditional`, `recommended`, and `reference`; active required/conditional items block final lifecycle closeout when unsatisfied, while recommended/reference items are displayed as non-blocking guidance. `JobDetailModal` shows a Closeout section for jobs in `work_complete_pending_closeout` or jobs with attached closeout requirements, highlights missing required items, and disables the Complete Job button until blocking requirements are satisfied. The final Complete Job action calls `useJobs.completeJobCloseout`, preserving lifecycle completion timestamps and leaving legacy `JobStatus` untouched. Customer-specific procedure rules are intentionally not implemented yet; future rule engines should attach generic requirements to jobs before evaluation.

### Procedure Definition Foundation

Generic, customer-agnostic procedure definitions live under `src/features/jobs/procedures/`. Procedure definitions are separate from Job records and are intended to be referenced later by procedure ID plus exact version rather than copied into each job. A procedure includes `id`, `customerKey`/optional `companyKey`, name, description, version, status (`draft`/`active`/`retired`), category, job type, timestamps, and ordered stable-ID steps. Each step carries one underlying data model that supports both Guided Mode (`guidedInstructions`) and Quick Mode (`quickCheckpoint`) without separate procedure copies. Steps can be required, conditional, recommended, or reference, and can include warning text, a generic condition, proof requirements, equipment/serial requirements, testing/validation metadata, and support/escalation metadata. Helper validation returns structured errors instead of throwing for ordinary malformed data. Version helpers treat a procedure version as immutable when a job reference list contains its exact procedure ID/version; editing should clone to a new draft version with deep-copied steps.

### Procedure Assignment

Jobs can optionally carry `procedureAssignment?: JobProcedureAssignment`, which stores only `{ procedureId, procedureVersion, assignedAt, assignmentSource, assignedBy?, note? }`. Full `ProcedureDefinition` objects remain separate from Job records. Assignment helpers in `src/features/jobs/procedures/jobProcedureAssignment.ts` validate stable procedure IDs, positive versions, assignment source, and optional supplied procedure definition ID/version matches. Pre-work jobs can assign, replace, or remove procedures directly. Jobs with started work or completed jobs return a structured `confirmation_required` result on normal change attempts; the confirmed helper path allows the change while preserving lifecycle, visits, proofs, inventory, notes, closeout requirements, timestamps, and revision-related fields. Same ID/version reassignment is idempotent and does not append duplicate history. Actual assignment/replacement/removal events are recorded in `procedureAssignmentHistory` as a focused audit trail and do not replace legacy `statusHistory` or legacy `JobStatus` behavior.

### Development Lifecycle Harness

The lifecycle acceptance harness is development-only and requires `import.meta.env.DEV` plus `VITE_ENABLE_JOB_LIFECYCLE_HARNESS=true`. When enabled, `useJobs` injects a fake Route A technician job with ID `dev-lifecycle-harness-job` into local job storage without adding it to the normal `SEED_JOBS` export. When disabled, the loader strips that harness job from the visible job list. The fake job starts with legacy `status: ready`, lifecycle `planned/not_started`, today's `scheduledDate`, and three fake closeout requirements: two required blockers (proof photo and serial/equipment ID) plus one non-blocking recommended note. More -> Development -> Reset Lifecycle Test Job restores it to the initial planned state and opens Jobs; the Job Detail closeout section includes a harness-only Satisfy Test Requirements button so final closeout can be exercised after first verifying the blocked state. No customer-specific procedure logic is included.

## Scheduling (Phase 1 — per-job workday)

Every job can be pinned to a local workday with `Job.scheduledDate?: string` (`YYYY-MM-DD` in `America/Los_Angeles`, never a UTC timestamp).

### Rules

- **`effectiveDay(job, today)`** (src/features/jobs/jobSchedule.ts): a valid `scheduledDate` always wins; an *invalid* date is never coerced and returns `null` so it surfaces as Needs Review; an undated Route A job that is actionable (`ready`/`revisit`/`outlier`) or `under_review` derives `today` (derived only, never persisted). Undated Route B / inactive jobs have no effective day and surface through the unscheduled review list.
- **Moving jobs**: moving to a future day sets `routeId: 'B'` (standby); moving to today sets `routeId: 'A'` and triggers re-optimization. Moves are in place (same job object) — no duplicates; proof/inventory/notes/statusHistory are preserved.
- **Past dates are disallowed** in Move-to-Day (native `input type="date"`, `min` today, `max` today+365). Invalid stored dates → Needs Review, never silently coerced.
- **Today's Route pool** = Route A jobs with `effectiveDay === today` (includes under-review for visibility; `activeRouteAJobs`/next stop excludes them). Postponed jobs are excluded and surfaced via the unscheduled review list.
- **Midday rollover**: local date is recomputed on mount/focus/visibilitychange/60s tick; only derived filters change, no job mutation, and active rides are never silently re-sorted.
- **Overdue**: an active job (`actionable` or `under_review`) pinned to a date strictly before today is surfaced in the strip's overdue review — never auto-moved.

### Migration (schema v5)

`JOB_STATE_SCHEMA_VERSION = '5'` (src/features/jobs/jobState.ts). Schema v4 introduced the legacy `jobs_moved_to_tomorrow` one-time migration into per-job `scheduledDate = tomorrow` + Route B. Schema v5 adds a backward-compatible optional `Job.lifecycle?: JobLifecycleState` overlay. Load/storage normalization preserves valid existing lifecycle state, creates deterministic defaults for jobs without lifecycle data, and keeps the legacy `JobStatus` system authoritative until the lifecycle migration is completed. Completed/finished legacy jobs map to lifecycle `completed`/`offsite`; under-review legacy jobs map to `work_complete_pending_closeout`/`offsite`; ready/revisit/outlier jobs map to lifecycle `ready`/`offsite`. The migration is idempotent and existing jobs without lifecycle data continue to load normally.

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
- **Job Normalization**: jobState.ts handles schema versioning and normalization (schema version "5"), including lifecycle overlay defaults for legacy jobs.
- **useJobs mutations**: `src/features/jobs/useJobs.ts` owns pure job-status mutations (`updateJobStatus`, `toggleJobComplete`, `markJobUnderReview`) and returns `JobMutationResult` so `App.tsx` can run cross-feature side effects without duplicating status mutation logic.
- **Lifecycle actions**: `useJobs.ts` exposes persisted lifecycle-only actions (`checkInJob`, `markJobReadyToStart`, `blockJobBeforeStart`, `startJob`, `pauseJobWork`, `resumeJobWork`, `awaitJobSupport`, `markJobBlockedOnsite`, `endJobVisit`, `markJobWorkComplete`, `completeJobCloseout`, `reopenCompletedJob`). These delegate to `jobLifecycle.ts`, return `JobLifecycleMutationResult`, block invalid transitions without persisting, preserve visit/event history, preserve lifecycle completion timestamps, and do not update legacy `JobStatus` yet.
- **Closeout evaluation**: `jobCloseout.ts` evaluates generic job-attached closeout requirements into satisfied required items, missing required items, active conditional requirements, non-blocking warnings/recommended items, references, and a completion-allowed flag.
- **Procedure definitions**: `procedures/procedureDefinition.ts` validates customer-agnostic procedure definitions, stable step IDs, nested requirement IDs, generic conditions, Guided/Quick text presence, step ordering, immutability checks, and clone-to-next-version behavior.
- **Procedure assignment**: `procedures/jobProcedureAssignment.ts` assigns/removes exact procedure ID/version references on jobs, requires explicit confirmation after work starts or completion, validates optional procedure definition matches, and records idempotent assignment history without changing legacy job status.
- **Lifecycle harness**: `jobLifecycleHarness.ts` owns the dev-only fixture, explicit environment guard, injection/reset helpers, and fake closeout requirement satisfaction helpers. The harness is excluded unless `VITE_ENABLE_JOB_LIFECYCLE_HARNESS=true` in a local dev build.
- **Job Overview derivation**: `jobOverview.ts` derives lifecycle display labels, Next Action, warnings/blockers, and compact summary metadata for `JobDetailModal`.

## Design Rationale

- **localStorage**: Single-user app, no need for complex persistence layer
- **Multiple statuses**: Different stages of job lifecycle require different handling
- **Proof vault integration**: Every completed job can have attached proof (photos, screenshots, receipts)
- **Outlier detection**: Jobs >4.2 miles from route are flagged for route efficiency analysis; the route-planning UI for those alerts lives under `src/features/routePlanning/`

## Dependencies

- localStorage for state persistence
- GPS API for coordinate capture
- File upload APIs for proof attachments
- `src/utils/bakersfieldCoordinates.ts` for shared Bakersfield seed-job coordinates and deterministic address resolution
- route utilities for distance calculations where jobs are displayed with route/travel context

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
- `src/types.ts` — Job type definitions (`scheduledDate`, `calendar`, `CalendarSourceMeta`, optional `lifecycle`)
- `src/features/jobs/useJobs.ts` — jobs state, scheduling derivations, pure job actions, and pure status mutation actions
- `src/features/jobs/types.ts` — jobs feature-local result types such as `JobMutationResult` and `JobLifecycleMutationResult`
- `src/features/jobs/jobState.ts` — schema normalization (v5), lifecycle defaults, and `migrateJobSchedules`
- `src/features/jobs/jobLifecycleTypes.ts` — v1 lifecycle state/event/visit types
- `src/features/jobs/jobLifecycle.ts` — lifecycle transition helpers
- `src/features/jobs/jobCloseoutTypes.ts` — generic closeout requirement and evaluation result types
- `src/features/jobs/jobCloseout.ts` — pure closeout requirement evaluation
- `src/features/jobs/procedures/types.ts` — customer-agnostic versioned procedure, step, condition, proof, equipment, validation, and escalation types
- `src/features/jobs/procedures/procedureDefinition.ts` — pure procedure validation, lookup, ordering, immutability, and version-cloning helpers
- `src/features/jobs/procedures/jobProcedureAssignment.ts` — pure version-specific procedure assignment, confirmation policy, validation, and assignment-history helpers
- `src/features/jobs/jobLifecycleHarness.ts` — dev-only lifecycle acceptance fixture and guard helpers
- `src/features/jobs/jobOverview.ts` — Job Detail overview and Next Action derivation
- `src/features/jobs/jobSchedule.ts` — scheduling/migration/grouping helpers
- `src/features/jobs/WeeklyStrip.tsx` — 7-day scheduling strip on the dashboard
- `src/features/jobs/ExpandedDayPanel.tsx` — per-day detail panel (jobs, pay, plan, review)
- `src/features/jobs/MoveToDaySheet.tsx` — move-a-job-to-a-day bottom sheet/modal
- `src/features/jobs/JobCard.tsx` — job display component
- `src/features/jobs/JobModal.tsx` — job editing/completion modal (optional schedule field)
- `src/features/jobs/JobDetailModal.tsx` — scheduled row + Move-to-Day action
- `src/features/jobs/JobsScreen.tsx` — jobs tab screen (list + filter + import)
- `src/features/jobs/RouteFilter.tsx` — route A/B filter component
- `src/utils/bakersfieldCoordinates.ts` — shared Bakersfield coordinate presets and deterministic address resolver used by seed jobs and job editing

## Related Knowledge

- [Shower Gate](./shower-gate.md) — prerequisite for job completion
- [Route System](./route-system.md) — route optimization with jobs
- [Proof Vault](./proof-vault.md) — proof attachment system

## Last Updated

2026-08-15 (Version-specific job procedure assignment helpers added)
