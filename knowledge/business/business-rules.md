# Business Rules

## Shower Gate

- **Required barcode:** `075371003233`
- **Cycle reset:** 6:00 AM local time (configurable via `SHOWER_CYCLE_RESET`).
- **Reset logic:** Comparison uses `< boundary`, not `<=`, to avoid off-by-one at exactly 6:00:00.
- **Protected tabs:** Route, Jobs, Battery, Tracker are locked until gate is verified.
- **Proof mandatory:** `SHOWER_PROOF_MANDATORY = true` — photo proof is required with the scan.
- **Daily requirement:** One scan per day. Once the cycle resets, the process repeats.

## Job System

- **Job types:** default, revision, process_serve, delivery, pickup.
- **Job statuses:** pending, in_progress, completed, failed, skipped, revision, archived.
- **Completion requires proof:** At least one proof attachment must be submitted.
- **Process serve jobs:** Identified by `jobType: "process_serve"` — legal document delivery.
- **Revision jobs:** Inserted into the optimized route order at the nearest position.

## Route Optimization

- **Algorithm:** Nearest-neighbor greedy.
- **Outlier detection:** Stops more than 4.2 miles from the nearest neighbor are flagged.
- **Battery-aware:** Route optimization considers remaining e-bike range.
- **Route A:** Main optimized job sequence.
- **Route B:** Standby jobs not yet assigned to the active route.

## E-Bike Configuration

- **Default model:** Jasion EB5.
- **Battery capacity:** 360Wh.
- **Top speed:** 18mph.
- **Consumption rate:** 2.8% per mile.
- **Estimated range:** 36 miles.

## Habit Tracker

- Mandatory shower is a built-in daily habit.
- Custom tasks can be added by the user.
- Streak tracking persists via localStorage.

---

**Last Updated:** 2026-07-20 (c12bd44)
