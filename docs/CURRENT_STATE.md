# Route Manager Current State

## Phase 1 Summary

Phase 1 implemented the approved Dashboard and Route Visibility plan without starting Phase 2 data-model cleanup.

Changed in Phase 1:

- Mission Control now renders only the active dispatch-center content: Next Stop, Navigate, Complete Job, Today's Route, Battery Status, Jobs Left, Estimated Earnings Today, AI Dispatcher message, and Revision Alerts.
- Ride logs, ride summary, Proof Vault, and full Battery Tracker content were removed from the rendered dashboard so the first screen stays field-focused.
- Today's Route now shows the full remaining active route in compact order instead of only the first four stops.
- Completed jobs remain hidden from the dashboard route because the route list is sourced from remaining Route A jobs.
- The bottom navigation is available on the dashboard so Route, Jobs, Tracker, and Settings remain reachable from Planning Mode.
- Add Stop Details and Add Process Serve are available from the Jobs tab.
- Manual Ride Mode entry remains available through the "I'm Riding" button.

Checks run during Phase 1:

- `npm run lint`: passed.
- `npm run build`: passed.
- Browser smoke test on `http://localhost:3000/`: passed for dashboard required cards, removed dashboard panels, and Jobs tab add controls.

## Phase 0 Summary

This audit found a working single-page Route Manager app with many of the requested field-work features already present. The code is concentrated in `src/App.tsx`, with supporting components for dispatcher, job import, job modal, map preview, route summaries, outliers, and scoring.

Checks run during Phase 0:

- `npm run lint`: passed.
- `npm run build`: passed.

## Existing Features

- Mission Control dashboard.
- Next Stop and active route actions.
- Today's Route list.
- Add Job and Add Process Serve flows.
- Process server-specific form fields based on ABC Legal-style work.
- AI Dispatcher V1 with deterministic command handling.
- Job completion workflow.
- Proof Vault with auto-created proof folders.
- Smart revision merge route optimization.
- Battery Tracker V1.
- Manual Ride Mode V2.
- Ride timer, ride analytics, ride summary, and ride log history.
- Import system for mock OCR, manual paste, share-sheet simulation, and partner simulation.
- Route scoring and outlier detection.
- Browser text-to-speech fallback with future premium provider wrappers.
- GitHub remote and Sites deployment project are configured.

## Current Data Model

Primary job data is defined by `Job` in `src/types.ts`.

Important fields:

- `storeName`
- `address`
- `pay`
- `estimatedMinutes`
- `jobType`
- `dueTime`
- `notes`
- `status`
- `routeId`
- `coordinates`
- `priority`
- `isRevisionRequired`
- `isCompleted`
- `deadline`
- `revisionStatus`
- `processServe`

Process server work is represented with `ProcessServeDetails`, including company, case number, party name, document type, attempt window, diligence notes, special handling, address status, attempt status, proof notes, recipient details, and proof requirements.

## Current Storage

The app is local-first and stores operational data in browser `localStorage`.

This currently works for rapid development and same-browser use. It is not yet enough for production-grade proof storage because proof files and long-term logs need durable storage, backup, and recovery.

## Known Limitations

- Route optimization uses local coordinate lookup and haversine/mock routing, not real bike-aware navigation.
- There is no configured database or object storage binding for jobs, proof files, or ride history.
- Proof assets are stored through browser-side file data/object references and should be hardened before real-world reliance.
- Screenshot OCR calls a provider-style endpoint, but the audited files do not confirm a complete production OCR backend.
- Premium voice providers call a future `/api/dispatcher/tts` endpoint and currently rely on browser voice fallback.
- AI Dispatcher is deterministic/local, not a live LLM-backed operations agent.
- Job status and flags exist in multiple forms (`status`, `isCompleted`, `isRevisionRequired`) and should be normalized carefully.
- Charging locations, saved home/base locations, and full daily calendar planning are not yet formalized.
- Phase 0 did not change UI or feature behavior by design.

## Phase 2 Recommended Plan

Phase 2 should focus on job data model cleanup, because the current app has multiple job state fields that work but need clearer consistency before adding more automation.

Recommended scope:

1. Normalize active, revision, completed, postponed, outlier, and process server job states.
2. Decide how `status`, `isCompleted`, and `isRevisionRequired` should relate.
3. Add safe localStorage migration handling for existing user data.
4. Keep process server jobs inside the shared route model.
5. Preserve all current completion, proof vault, dispatcher, and route behavior.
6. Run TypeScript/build checks and browser smoke tests.

## Approval Needed

Per the current instruction, implementation should stop here before Phase 2.
