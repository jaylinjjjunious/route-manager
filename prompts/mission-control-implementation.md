# Mission Control — Implementation Prompt

Repository: jaylinjjjunious/route-manager
Branch: main

Task:
Implement Mission Control as the active-workday execution screen for All In One.

This is NOT a second Home/Dashboard and NOT a replacement for Jobs.
Mission Control should answer one question:

> What should I do right now during my workday?

Use the existing architecture and data sources. Do not duplicate lifecycle, jobs, route, procedure, proof, inventory, earnings, transit, or alert state.

## Product role

Home = broad overview.
Jobs = all jobs, filters, creation/import, editing.
Mission Control = active execution layer for the current workday.

Mission Control should prioritize:
- current job
- next job
- current route progress
- travel/transit state
- urgent blockers/alerts
- missing proof/inventory/closeout items
- today's earnings/progress
- concise AI guidance hook only if an existing assistant surface can be reused safely

Do not turn Mission Control into a giant report.
Use progressive disclosure and large readable mobile typography.

## 1. Inspect existing implementation first

Before adding code, inspect:
- current Home/Dashboard screen
- existing navigation structure
- route/today data
- lifecycle helpers
- JobOverview derivation
- procedure progress
- closeout evaluation
- Proof Vault
- Inventory Custody
- transit/travel surfaces
- earnings calculations
- alerts/warnings

Reuse existing selectors/helpers where possible.

Do not create new duplicate stores for data already owned elsewhere.

## 2. Add Mission Control screen

Create a dedicated Mission Control screen/feature.

Preferred location:
- src/features/missionControl/

Possible structure:
- MissionControlScreen.tsx
- missionControlModel.ts
- tests/missionControl.test.ts

Keep business derivation in pure helpers where practical.

## 3. Mobile-first hierarchy

Top of screen should show only high-value execution information.

Suggested hierarchy:

### A. Shift / Day status header
Show concise day-level state:
- today's date
- jobs completed / total
- route progress
- today's earnings

Keep this compact.

### B. CURRENT JOB
If a job is active/in-progress, this is the dominant card.

Show:
- customer/store
- address
- device badges if relevant
- lifecycle/work state
- procedure progress
- current blocker count
- one dominant Next Action
- Continue Procedure when relevant

Actions should call existing lifecycle / Job Detail behaviors.
Do not implement lifecycle transitions again.

### C. NEXT JOB
Show only the next actionable job.

Include:
- customer/store
- address
- scheduled time
- estimated travel/time if existing data supports it
- priority/urgency if meaningful

Primary action:
- Open Job
or
- Navigate / Start Travel if an existing route/travel action exists

Do not display the entire route list here.

### D. TRAVEL / ROUTE STATUS
Show concise travel execution state:
- next stop
- remaining stops
- route progress
- transit/travel alert if applicable

Use existing route/transit data.
No new routing engine.

### E. URGENT ATTENTION
Only show actionable items.

Examples:
- active job blocked onsite
- awaiting support
- procedure assignment unresolved
- required proof missing before closeout
- serial/equipment requirement missing
- return obligation incomplete
- schedule conflict if existing data can determine one

Each alert must link to the owning system/job.

Do not copy the source data into Mission Control.

### F. TODAY'S MONEY
Compact earnings card:
- earned/completed today
- pending active work value
- total scheduled value if existing data supports it

Use the existing earnings calculation source.
Do not introduce a second earnings calculation.

## 4. Empty states

Handle:
- no jobs today
- jobs today but none active
- all jobs completed
- active job missing procedure
- route not configured
- travel provider unavailable

Empty states should tell the user the next useful action.

Example:
"No active job. Your next job is Sonic #123 at 10:30 AM."

## 5. Mission Control actions

Mission Control should mostly deep-link into existing screens rather than recreate them.

Possible actions:
- Open Current Job
- Continue Procedure
- Open Next Job
- View Route
- View Closeout Blockers
- Open Inventory
- Open Proof

If needed, add small navigation intent/state plumbing to open JobDetailModal to the correct tab:
- WORK
- PROCEDURE
- CLOSEOUT
- DETAILS

Do not duplicate those interfaces inside Mission Control.

## 6. Navigation

Add Mission Control as a first-class navigation destination.

Target product navigation:
Home | Jobs | Mission Control | Route & Travel | More

If the current nav cannot safely fit five primary destinations yet, inspect the existing navigation and implement the smallest clean route to make Mission Control directly accessible.

Do not break existing navigation or browser/PWA behavior.

## 7. Readability

Mission Control is a field-work screen.

Requirements:
- meaningful text >= 12px
- primary actions 14–16px
- large tap targets (~44px where practical)
- no wall of tiny badges
- no giant continuous scroll
- current action visible immediately
- use compact sections and progressive disclosure

Test widths:
- 320px
- 390px
- 430px

## 8. Derivation model

Create a pure Mission Control model that derives, without mutation:
- active/current job
- next job
- jobs completed/remaining today
- route progress
- urgent blockers
- procedure/closeout summary for current job
- earnings summary if existing helpers support it

Prefer existing canonical lifecycle/status helpers.

Do not infer from raw legacy status if a normalized lifecycle helper already exists.

## 9. Current job selection

Selection priority should be deterministic.

Preferred rules:
1. active visit / actively working job
2. paused / awaiting support / blocked onsite current job
3. work-complete-pending-closeout job requiring immediate closeout attention
4. otherwise no current job

Do not silently mark a merely scheduled job as current.

## 10. Next job selection

Choose from today's unfinished actionable jobs.

Prefer existing route order when available.
If route order is unavailable, use existing schedule/order semantics.

Do not invent a new optimization algorithm.

## 11. Alerts/blockers

Mission Control alerts should be derived from canonical sources.

Examples:
- JobOverview warnings
- unresolved procedure assignment
- effective Closeout Gate blockers
- lifecycle blocked/awaiting-support state
- Inventory return obligations

Deduplicate alerts.
Limit the visible urgent list to a small number, with "View all" only if necessary.

## 12. AI assistant hook

Do NOT build a new AI backend in this task.

If an existing AI Assistant surface already exists, add a lightweight context handoff such as:
- Ask about current job
- What should I do next?

If this would require new API/backend/key work, leave a clearly marked interface point and do not block Mission Control on it.

## 13. Tests

Add tests covering at least:
1. no jobs today
2. scheduled jobs but no current job
3. actively working job becomes current
4. paused job remains current
5. awaiting-support job remains current
6. work-complete-pending-closeout surfaces closeout attention
7. route order determines next job when available
8. completed jobs excluded from next-job selection
9. current job Next Action uses existing JobOverview derivation
10. unresolved procedure warning appears
11. closeout blocker count uses existing evaluator
12. urgent alerts deduplicate
13. earnings use existing calculation/helper
14. Mission Control mobile screen renders current + next job
15. navigation opens Mission Control
16. Continue Procedure opens correct job/procedure context
17. Open Closeout opens correct closeout context
18. legacy jobs still work
19. no duplicate lifecycle/procedure/inventory/proof state created
20. existing test suite does not regress

## 14. Validation

Run:
- npm test
- npm run lint
- npm run build

Do not declare completion with failures.

Then launch locally with:
VITE_LOCAL_AUTH_BYPASS=true
VITE_ENABLE_SONIC_PROCEDURE_HARNESS=true

Report the exact local URL emitted by the dev server.

Manually validate Mission Control with the Sonic harness:
- no active job state
- active Sonic job
- paused Sonic job
- blocked/awaiting support
- closeout-pending job
- route with multiple Sonic jobs

## 15. Git / deployment

Work from current main.

If working tree is clean and main is current:
- commit Mission Control as a separate feature commit
- push to main

If not clean/current:
- use feature/mission-control-v1
- report branch clearly

If the repository is already connected to Railway auto-deploy on main, verify the deployment triggered and report status.
Do not claim deployment success without verification.

## Final report

Report:
1. files changed
2. Mission Control architecture
3. navigation changes
4. current-job selection rules
5. next-job selection rules
6. route/travel summary behavior
7. urgent alert sources
8. earnings source
9. Job Detail deep-link behavior
10. AI hook added or intentionally deferred
11. empty states
12. mobile validation
13. tests
14. lint
15. build
16. exact local URL
17. commit SHA
18. branch pushed
19. Railway/deployment status if applicable
20. remaining Mission Control gaps

Do not add unrelated features in this task.
