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

Dashboard Today's Route cards open a compact read-only detail panel for the selected job when the main card surface is tapped or clicked. The panel resolves the selected job from current app state by job ID, so Job 1, Job 2, and later route stops each show their own live data. Existing card action controls such as Navigate, Review, and Move stop event propagation and do not open the detail panel.

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
- `src/types.ts` — Job type definitions
- `src/utils/jobState.ts` — schema normalization
- `src/components/JobCard.tsx` — job display component
- `src/components/JobModal.tsx` — job editing/completion modal
- `src/components/OutlierDetector.tsx` — outlier detection UI

## Related Knowledge

- [Shower Gate](./shower-gate.md) — prerequisite for job completion
- [Route System](./route-system.md) — route optimization with jobs
- [Proof Vault](./proof-vault.md) — proof attachment system

## Last Updated

2026-07-22 (dashboard-route-job-details)
