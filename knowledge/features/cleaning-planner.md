# Personal Cleaning planner

The user wants a new independent software room for their own cleaning, eventually their own cleaning business. This first version supports personal routines; customer management, quotes, invoices, teams and cloud accounts are deferred.

## Ownership and entry

- Source/package/build/tests: `apps/cleaning/`; hallway registry: `apps/hallway/src/rooms.ts`.
- Public URL `/cleaning/`; internal hashes Today, Spaces, History. Main menu returns to `/#home`.
- Gateway serves static files independently of Route Manager. No room code, authentication or API imports. Standalone hosting can override base/entry URLs.

## Behavior

Create named spaces and tasks with estimated minutes, due date and one-time or repeating intervals. Today lists due/overdue active tasks and estimates; a completion schedules a repeating task from the actual local completion day, or finishes a one-time task. Duplicate same-day completions are guarded. History snapshots the title/space/time. Undo restores the prior schedule only when the task still has that completion's state, preserving later text edits. Archive/restore hides work without removing history. Starter suggestions require an explicit click and merge with existing work.

## Storage and backups

Browser-only `all-in-one.cleaning.personal.v1` stores a validated version-1 plan. No sync/login or server database. Writes validate and check the last observed raw value before updating UI; quota/unavailable storage fails visibly. Storage events refresh other open tabs, but localStorage is not a transactional database. Invalid stored content is not overwritten during ordinary edits and can be exported. Recovery imports first preserve original raw data under a timestamped recovery key.

Export JSON from Backup. Imports validate version, dates, field types, IDs, references and limits (2 MB), add missing IDs and retain existing versions; importing the same file again adds no duplicates. These backups contain the user's task/history text. Keep them private. Future cloud migration must explicitly confirm ownership of this unowned device plan.

## Validation

Eleven model/storage/UI tests cover recurrence, dates, undo, archives, backup validation/merge, persistence and failures. Two hallway and seven gateway tests cover entry and routing isolation. Root lint/build pass. Local production UI verified hallway entry/return, create space/task, completion, history/undo, reload, archive/restore and actual JSON download/import. Public verification is recorded in APP_LIFELINE.md after deployment.

## Release evidence (2026-10-20)

Implementation 2d80a9cab5536d83806bfeb4e33e0f5e8b2f9220 is on GitHub main and public Render (exact /api/build-info SHA). Public browser verified hallway entry/return, create space/task, complete, history/undo, reload persistence, archive and actual backup export/import. Narrow 675px view has no horizontal overflow. Verification completion was undone and labeled test space archived; no user cleaning history was invented. Eleven Cleaning, two hallway and seven gateway tests plus lint/build pass. Browser-only storage/no cloud sync remains the disclosed limitation.
