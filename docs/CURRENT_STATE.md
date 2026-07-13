# Route Manager Current State

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

## Phase 1 Recommended Plan

Phase 1 should focus on dashboard and route visibility, because the dashboard is the user's first screen and field-work command center.

Recommended scope:

1. Compare the current dashboard against the required-only Mission Control list.
2. Keep Next Stop as the largest card and make Navigate/Complete impossible to miss.
3. Keep Today's Route compact and pinned near the top on mobile.
4. Ensure completed jobs never appear in the active dashboard route.
5. Relocate or collapse anything that reads like settings, analytics, or long-form content.
6. Preserve Add Job and Add Process Serve access in Planning Mode.
7. Keep Ride Mode free of the full Battery Tracker panel and AI Dispatcher panel.
8. Run TypeScript/build checks and Playwright visual checks on desktop and mobile.

## Approval Needed

Per the attached instruction, implementation should stop here until the user approves moving into Phase 1.
