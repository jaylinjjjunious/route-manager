# Route Manager Roadmap

## Phase 0: Audit And Documentation

Status: complete in documentation, pending user approval before Phase 1 behavior changes.

Goals:

- Inspect the current repository.
- Run build/type checks.
- Identify app entry points, state flow, storage, and existing feature coverage.
- Document product spec, roadmap, architecture, decisions, and current state.
- Propose the Phase 1 implementation plan.

## Phase 1: Dashboard And Route Visibility

Goal: make Mission Control the fastest possible answer to "what do I do next?"

Planned work:

- Audit the current dashboard against the required-only content list.
- Keep the Next Stop and action buttons visually dominant.
- Keep Today's Route compact, visible, and current-stop pinned.
- Relocate or hide anything that feels like settings, analytics, or long-form content from the main dashboard.
- Ensure Add Job and Add Process Serve are discoverable in Planning Mode without cluttering Ride Mode.
- Add responsive checks for phone and desktop layouts.

## Phase 2: Job Data Model Cleanup

Goal: make job state predictable before adding more automation.

Planned work:

- Normalize active, revision, completed, postponed, outlier, and process server job states.
- Make completion and revision flags derive consistently from status where possible.
- Protect existing localStorage migrations.
- Keep process server fields inside the shared job model.

## Phase 3: Proof Vault Hardening

Goal: make proof reliable enough for disputes.

Planned work:

- Improve proof folder creation and late-proof editing.
- Add clearer proof completeness indicators.
- Add process server-specific proof checklist fields.
- Prepare storage boundaries for a future database or file bucket.

## Phase 4: Battery And Ride Analytics

Goal: separate ride time, store time, and battery learning cleanly.

Planned work:

- Keep battery usage tied to ride time and route distance.
- Improve learned battery performance over time.
- Preserve battery used and earnings per hour after ride stop.
- Keep full battery settings out of Ride Mode.

## Phase 5: Smart Revision Merge

Goal: make mandatory revisions automatically fit into the active route.

Planned work:

- Strengthen revision insertion scoring.
- Explain every revision move in plain language.
- Include distance, time, battery, deadline, and route-position tradeoffs.

## Phase 6: Process Server Workflow

Goal: make process server jobs feel first-class.

Planned work:

- Refine ABC Legal-style form fields.
- Add attempt-result workflow.
- Add proof-of-service notes and checklist.
- Support failed attempts without treating them like retail job failures.

## Phase 7: Import Pipeline

Goal: make job intake faster and safer.

Planned work:

- Tighten manual paste parsing.
- Improve screenshot/OCR fallback behavior.
- Keep credentials out of the app.
- Prepare provider adapters for future authorized integrations.

## Phase 8: AI Dispatcher Actions

Goal: make dispatcher actions deterministic, undoable, and useful.

Planned work:

- Expand command recognition carefully.
- Add safer confirmations for high-impact moves.
- Keep quick commands field-friendly.
- Preserve undo history for route mutations.

## Phase 9: Voice And Hands-Free Support

Goal: provide optional spoken status without making the app depend on premium APIs.

Planned work:

- Keep browser speech as the default fallback.
- Add server-side voice provider only when keys and endpoints exist.
- Avoid reading sensitive proof details aloud by default.

## Phase 10: Persistence Upgrade

Goal: move from browser-only localStorage toward durable storage.

Planned work:

- Define a storage migration plan.
- Add backup/export.
- Consider database and asset storage for proof files.
- Keep local-first behavior during the transition.

## Phase 11: Real Routing

Goal: move from mock/haversine routing toward real bike-aware routing.

Planned work:

- Add provider abstraction for real directions.
- Support travel-time estimates by bike.
- Preserve app behavior when route API is unavailable.

## Phase 12: Deployment And Release Workflow

Goal: keep GitHub and the deployed site aligned.

Planned work:

- Commit meaningful changes to GitHub.
- Deploy approved app changes through Sites.
- Verify hosted pages after deployment.
- Track build failures and Cloudflare Worker errors.

## Phase 13: Testing

Goal: protect the field workflow from regressions.

Planned work:

- Add focused unit tests for route and battery logic.
- Add Playwright checks for dashboard, add job, process serve, completion, Ride Mode, and proof vault.
- Validate mobile and desktop layouts.

## Phase 14: Production Readiness

Goal: make the app dependable for daily use.

Planned work:

- Improve error states.
- Add backup/restore.
- Document recovery steps.
- Review privacy, storage, and proof handling before broader use.
