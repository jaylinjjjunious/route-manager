# Monthly Probation Check-In

## Purpose

All In One acts as a discipline coach for the user's required monthly CE Check-In. The official reporting window is the 1st through the 10th. Job actions lock beginning on the 8th when the current month has not been recorded as complete.

## Monthly Policy

| Dates | State | Job access |
|---|---|---|
| 1st–3rd | Early Action | Available |
| 4th–7th | Coach Mode | Available |
| 8th–10th | Urgent Mode | Locked |
| After 10th without completion | Overdue | Locked |
| Completed in current month | Check-In Recorded | Available |

The cycle key is the local calendar month (`YYYY-MM`). Completion immediately unlocks job actions. The next month starts a fresh cycle automatically.

## Workflow

`ProbationCheckInPanel` appears on Today and Jobs. **Check In Now** logs the launch time and opens the official CE Check-In website in a new browser tab. After completing the official flow, the user can attach a screenshot and/or use the one-tap **I Completed It** acknowledgement. The panel records device class, event timestamps, reporting month, proof metadata, and verification level.

Incomplete states use the full coaching panel so the requirement cannot be missed. After completion, the panel collapses to a compact green confirmation row that keeps the monthly status visible without crowding the dashboard. The `AIØ17` header remains unchanged.

Phone and tablet users receive the image picker. Computer users additionally receive browser screen capture, which always requires the browser's permission prompt. The app never claims a screenshot exists when capture was canceled or unavailable.

## Verification Levels

- `self_confirmed`: user acknowledgement only; the provider supplied no receipt.
- `screenshot_documented`: a compressed screenshot is stored with the monthly record.
- `provider_verified`: reserved for a future CE confirmation number, message, URL, or API integration.

Future-ready fields are included for provider receipt ID, confirmation URL, and confirmation message ID. The current CE flow exposes no public receipt or API integration, so these fields remain empty.

## Storage And Limits

Monthly records use the existing browser-local `safeStorage` pattern under `aio_probation_check_ins_v1`, retaining up to 24 months. Screenshots reuse the existing proof-image compression routine before storage. Records are an internal discipline/audit log, not independent proof from CE Check-In and not a substitute for instructions from a probation officer.

## Job Enforcement

The probation lock composes with the existing shower gate through the shared `jobAccessReady` boundary in `App.tsx`. While locked, schedule information and job details remain viewable, but navigation, status/lifecycle actions, Ride Mode, adding, optimization, moving, review, and completion are blocked or disabled.

## Source Files

- `src/features/probation/probationPolicy.ts`
- `src/features/probation/useProbationCheckIn.ts`
- `src/features/probation/ProbationCheckInPanel.tsx`
- `src/App.tsx`
- `src/components/aio/TodayScreen.tsx`
- `src/features/jobs/JobsScreen.tsx`
