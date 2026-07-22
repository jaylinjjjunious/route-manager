# All in One 667 Decisions

## D001: Keep The Existing App Instead Of Rebuilding

The current app already contains dashboard, routing, battery, Ride Mode, process server, proof vault, dispatcher, import, and ride log features. Future work should refine and stabilize this app rather than replace it from scratch.

## D002: Mission Control Is The First Screen

The dashboard should be the app's default first experience. It should prioritize next action, active route, battery, jobs left, earnings, revision alerts, and dispatcher status.

## D003: Planning Mode And Ride Mode Are Separate Experiences

Planning Mode can show organizing, importing, settings, analytics, and review tools. Ride Mode should stay distraction-free and should not show the full Battery Tracker panel or AI Dispatcher panel.

## D004: Ride Mode Starts Manually

Ride Mode should not activate automatically. The user starts it with the "I'm Riding" button and ends it with "End Ride".

## D005: Local Storage Is The Current Persistence Layer

The app currently uses browser `localStorage` for jobs, route state, battery settings, proof vault, dispatcher messages, and ride logs. This is acceptable for current local-first development, but proof assets and daily work history need a stronger persistence plan before production use.

## D006: Revisions Stay In The Main Route

Revision jobs are mandatory work and should be merged into Today's Route. They should not be separated into a different list.

## D007: Process Server Jobs Are First-Class Jobs

Process server jobs use the shared `Job` model with `jobType: "process_serve"` and structured `ProcessServeDetails`. They should route with retail/gig work while retaining their own attempt and proof details.

## D008: Completion Creates Proof

Completing any job should create or update a proof folder automatically. This protects the user if the completion is questioned later.

## D009: Provider Abstractions Should Stay Pluggable

Routing and voice are currently abstracted enough to support future providers. Keep this direction so real routing, OCR, and TTS can be added without rewriting field workflows.

## D010: Hosted Worker Must Avoid Browser API Crashes

`app/page.tsx` uses a mounted client guard before rendering `src/App.tsx`. This protects Worker/server render paths from browser-only APIs such as `localStorage`.

## D011: GitHub And Sites Are Separate Remotes

GitHub is configured as the source repository remote, while Sites uses its own deployment remote/project. Approved changes should be committed and pushed intentionally, then deployed through the Sites flow when app behavior changes.

## D012: No Feature Behavior Changes During Phase 0

The attached instruction explicitly says to start with Phase 0 only and not modify feature behavior until the user approves the plan. This documentation pass follows that boundary.
