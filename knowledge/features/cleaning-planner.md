# Personal Cleaning planner

The user wants a new independent software room for their own cleaning, eventually their own cleaning business. This first version supports personal routines; customer management, quotes, invoices, teams and cloud accounts are deferred.

## Ownership and entry

- Source/package/build/tests: `apps/cleaning/`; hallway registry: `apps/hallway/src/rooms.ts`.
- Public URL `/cleaning/`; internal hashes Today, Spaces, History. Main menu returns to `/#home`.
- Gateway serves static files independently of Route Manager. No room code, authentication or API imports. Standalone hosting can override base/entry URLs.

## Cleaning work sessions (2026-10-21)

Cleaning now supports room/activity selection → Get ready (plan plus optional tools checklist) → Clock in → hands-off work → Clock out. The current session panel is visible on all Cleaning pages with Pause/Resume, See routine & tools and Clock out. Work uses saved timestamps rather than timer ticks; reload/closing does not end a session. Pause time is excluded. Clock-out requires an explicit All finished or Some work remains choice, supports an optional note, and saves completed/remaining activities plus working/break time in History. No per-step interactions are required while cleaning. Existing tasks/routines are preserved; session outcomes do not silently complete scheduled tasks.

TaskCreator Get ready is the primary entry; Add selected tasks remains an optional task-list action. Preparation is a draft until Clock in, which atomically persists the room and session. Back restores the chosen room/activities. Tool checks are suggestions, not mandatory gates. Only one active session per browser plan. Clock-out defaults to no outcome until selected. A partial finish leaves its unfinished list in History, without inventing follow-up tasks.

Optional top-level sessions are saved in plan version 3 under the existing storage key. Old versions 1/2 still import; older app tabs reject v3 rather than drop sessions. Snapshots include room/name, selected activities/tools, start/pause/end timestamps, accumulated paused milliseconds, completion subset and note. Validation checks IDs/references, one active session, subsets, time order, counts (2000 sessions) and existing 2 MB limit. Backups preserve sessions; conflicting active-session imports reject rather than overwrite. Storage failures keep the UI and record unchanged. Device-clock corrections can affect elapsed time; backwards action timestamps fail explicitly. Browser-only storage/sync limits remain.

Sources: sessions.ts, CleaningSession.tsx, TaskCreator.tsx, App.tsx, model.ts. Twenty-three focused tests and root lint/build pass; local browser verified prepare/tools/start, running and paused reload recovery, resume, partial clock-out and History. Public release pending.

## Reusable room routines (2026-10-20)

Each physical cleaning space now has an optional reusable ordered routine, separate from scheduled tasks. Today shows room entry cards; Spaces offers Build/Edit routine (one step per line) and Start/Continue. A visit snapshots the room name and steps, saves each sequential completion, supports Undo last step and pause/reload, and requires all steps before Finish. Finish records the visit in History; starting again resets the entire checklist, including on the same day. Edits affect future visits, preserving in-progress/history snapshots. Archives retain routines and visits. Browser-only persistence and existing task schedules remain unchanged.

Version-1 plans still import; plans containing routine fields upgrade to version 2 when validated/saved. Older app tabs reject version 2 and block edits instead of silently dropping routine data. Optional space fields `routine` (up to 100 nonempty steps, 200 characters each) and `runs` (up to 500 visits per room). Each run stores ID, name/step snapshots, completed-step count and start/finish timestamps. Validation rejects duplicate run IDs, multiple unfinished visits and inconsistent completion counts/timestamps. Existing JSON backup validation, additive current-wins merge, raw recovery and save-failure guards apply. No automatic trimming of history. Older plans upgrade without copying or losing data; legacy running tabs must reload if they report an unsupported plan.

Related source: `apps/cleaning/src/RoomRoutine.tsx`, `routines.ts`, `model.ts`, `App.tsx`. Sixteen Cleaning tests pass, including order, fresh same-day runs, snapshot editing, old backups, reload/resume and failed-finish persistence. Local production UI verified creation, step progression, pause/reload and history. Released at b8b20303fd2d256ac6c0efcc2f32795cebab8100: GitHub main and public Render exact build SHA verified. Public browser verified editor/start, sequential completion, reload/resume, finish/history snapshots, fresh same-day restart, archive retention, backup download/import and hallway return. Labeled test space is archived; one clearly labeled test visit remains in History. Sixteen Cleaning tests and root lint/build pass. No required work remains; browser-only storage is still disclosed.

## Simplified activity page (2026-10-20)

User rejected the final task-details form. Add task now stops at room → activity selection. Activity buttons toggle selection in place; Add selected tasks atomically saves them with any draft room and keeps the same room mini page open with a visible success message. Custom task text is entered inline. Back/Close save nothing. New tasks are one-time, due today, with a disclosed 10-minute estimate; existing task schedules and room routines are unchanged. Task editing remains available separately.

Eighteen tests cover selecting multiple activities without navigation, inline custom tasks, atomic room/task save failure, same-page success, cancellation and existing routines. Lint/build and browser Released at 9ed00c37e7dfa757a0f613cbaf4ba2d1ad2ef39a; GitHub main and public Render exact SHA verified. Eighteen tests and root lint/build pass. Local browser checked multi-selection/save/reload; public browser checked Bathroom selection/deselection without navigation, inline custom selection, same-page Add success, reload persistence and archive. Verification task archived without completion. User tab 7 is left on Bathroom activities; no required work remains.

## Previous room-first task creation (superseded final step)

Add task now opens a room chooser, then room-specific activities, then task details. User confirmed Dishes belongs inside Kitchen. Kitchen offers Dishes/Counters/Sink/Stove/Floor; Bathroom offers Toilet/Sink/Shower or tub/Mirror/Floor; Bedroom and Living area have their own suggestions. Existing active rooms and custom rooms/tasks are supported. Suggested rooms are drafts: room and task save atomically only on Save task; cancel/back creates no records. Existing active rooms are reused case-insensitively. Archived rooms are not silently restored. Add task works even with no spaces. Edit task retains its direct form. No schema/storage-key or routine change.

TaskCreator.tsx owns the room/activity/detail steps; TaskForm supports a prefilled name and Back. App saves a missing room with its first task through the existing validated commit. Eighteen Cleaning tests cover nested choices, cancellation, Back, active-room reuse and atomic save failure alongside existing routines/tasks. Released at bdcba1cbf2c19f576c7bf179e7453d0e6e9faf9d; GitHub main and public Render exact SHA verified. Public browser verified Bathroom choices, Kitchen → Dishes → details, Back/Cancel, custom-room entry, save/reload and active Kitchen reuse. Verification task was archived without completing it; no cleaning history added. Eighteen Cleaning tests plus root lint/build pass. Kitchen choices are left open. No required work remains.

## Behavior

Create named spaces and tasks with estimated minutes, due date and one-time or repeating intervals. Today lists due/overdue active tasks and estimates; a completion schedules a repeating task from the actual local completion day, or finishes a one-time task. Duplicate same-day completions are guarded. History snapshots the title/space/time. Undo restores the prior schedule only when the task still has that completion's state, preserving later text edits. Archive/restore hides work without removing history. Starter suggestions require an explicit click and merge with existing work.

## Storage and backups

Browser-only `all-in-one.cleaning.personal.v1` stores a validated plan (version 1 for legacy tasks, version 2 when routines exist, version 3 when sessions exist). No sync/login or server database. Writes validate and check the last observed raw value before updating UI; quota/unavailable storage fails visibly. Storage events refresh other open tabs, but localStorage is not a transactional database. Invalid stored content is not overwritten during ordinary edits and can be exported. Recovery imports first preserve original raw data under a timestamped recovery key.

Export JSON from Backup. Imports validate version, dates, field types, IDs, references and limits (2 MB), add missing IDs and retain existing versions; importing the same file again adds no duplicates. These backups contain the user's task/history text. Keep them private. Future cloud migration must explicitly confirm ownership of this unowned device plan.

## Validation

Eleven model/storage/UI tests cover recurrence, dates, undo, archives, backup validation/merge, persistence and failures. Two hallway and seven gateway tests cover entry and routing isolation. Root lint/build pass. Local production UI verified hallway entry/return, create space/task, completion, history/undo, reload, archive/restore and actual JSON download/import. Public verification is recorded in APP_LIFELINE.md after deployment.

## Release evidence (2026-10-20)

Implementation 2d80a9cab5536d83806bfeb4e33e0f5e8b2f9220 is on GitHub main and public Render (exact /api/build-info SHA). Public browser verified hallway entry/return, create space/task, complete, history/undo, reload persistence, archive and actual backup export/import. Narrow 675px view has no horizontal overflow. Verification completion was undone and labeled test space archived; no user cleaning history was invented. Eleven Cleaning, two hallway and seven gateway tests plus lint/build pass. Browser-only storage/no cloud sync remains the disclosed limitation.
