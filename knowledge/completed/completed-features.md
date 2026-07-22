# Completed Features

## Navigation
- 6-tab navigation with protected tab support.
- Bottom navigation with overflow handling for small screens.

## Shower Gate
- Daily barcode scan verification (barcode: 075371003233).
- Proof upload with camera or file picker.
- Cycle management with 6:00 AM reset.
- Panel hidden from Dashboard after cycle completion.

## Job System
- 5 job types: default, revision, process_serve, delivery, pickup.
- 7 job statuses for lifecycle tracking.
- Completion workflow with proof attachment requirement.
- Proof vault for storing job completion evidence.

## Route Optimization
- Nearest-neighbor greedy algorithm.
- Battery-aware routing based on e-bike range.
- Outlier detection for inefficient route additions.
- Route A (active) and Route B (standby) separation.

## Ride Mode
- Distraction-free execution surface.
- Job completion and proof upload within Ride Mode.
- Auto-navigation to next stop.

## Habit Tracker
- Mandatory shower verification as built-in habit.
- Custom daily task creation.
- Daily streak tracking.

## AI Integration
- AI Dispatcher with Gemini 2 chat.
- Route and job advice via conversational interface.

## Safety
- Safety News brief for Bakersfield area.
- Google News RSS integration.

## Utilities
- Screenshot OCR import for job data extraction.
- Text-to-speech with 3 providers (Gemini, OpenAI, ElevenLabs).
- Debug Center for diagnostics and system status.

## Authentication
- Supabase authentication (magic link + email/password).
- JWT token handling with refresh.

## Deployment
- Railway deployment with Autodeploy from main.
- Cloudflare Worker API variant.
- Checkpoint and release scripts (`scripts/checkpoint.cjs`, `scripts/release.cjs`).
- Verify script (`scripts/verify.cjs`) for lint + build.

## Documentation
- Knowledge system (this directory).

---

**Last Updated:** 2026-07-22 (dashboard-route-job-details)


## 2026-07-22

- Dashboard authoritative route interface: standalone Route page and navigation destination retired; shared route calculations and Dashboard route controls preserved.
