# Current Implementation State

## Phase

**Phase 2 active.** Core features are built and deployed. Phase 3 (server sync, multi-user, team dashboard) has not started.

## Phase 1 Scheduling

Implemented on top of the existing job system:
- `Job.scheduledDate?: string` — local workday `YYYY-MM-DD` in `America/Los_Angeles` (never UTC).
- Mission Control dashboard gains the weekly strip (`WeeklyStrip`), expanded day panel (`ExpandedDayPanel`), and move-to-day sheet (`MoveToDaySheet`).
- Today's Route pool = Route A jobs with `effectiveDay === today`; future-dated jobs live on standby (Route B).
- Legacy `jobs_moved_to_tomorrow` migrated to per-job `scheduledDate` (schema v4).
- Weather/AQ (Phase 2 of scheduling) and TTS companion (Phase 3 of scheduling) remain planned; strip shows `◌` placeholders.

## Features Built

- **AIØ three-tab navigation (Today / Jobs / More):** iOS-style redesign of the primary interface. The former Mission Control dashboard is now the **Today** readiness screen (Road Readiness + Next Best Job/Current Job, Travel Plan, Today's Other Jobs, This Week strip). Road Readiness requires a reviewed Preview Guide for every actionable job, applies exact wind gating, and keeps battery informational. **Jobs** is the schedule list (today, later days, Route B standby, overdue/unscheduled review), and **More** is the hub for all legacy tabs (Inventory, Battery, Tracker, Habits, Tools, Settings) plus Proof Vault, Add Process Serve, Import Screenshots, Debug Center, account, theme, and Sign Out. New AIØ design tokens (`--color-aio-*`) and primitives in `src/components/aio/`. Dev-only screenshot mode (`VITE_TODAY_SCREENSHOT_MODE`) and `scripts/screenshot-today.mjs` for headless layout verification (320/390/430 px, dark/light).
- **6-tab navigation:** Inventory, Battery, Tracker, Habits, Tools, Settings — now reachable from the More screen, with protected tab support.
- **Daily Shower Gate:** Barcode scan + proof upload + cycle management with 6:00 AM reset remain implemented, but access enforcement is temporarily bypassed by SHOWER_GATE_REQUIRED = false in src/App.tsx.
- **Job system:** 5 types, 7 statuses, completion workflow, proof vault.
- **Route optimization:** Nearest-neighbor algorithm, battery-aware, outlier detection.
- **Today's Route / AIØ Today screen:** The Today screen is the authoritative route-planning and route-management surface; the standalone Route page has been retired. Job rows open compact per-job detail panels from the card surface.
- **Ride Mode:** Distraction-free execution surface for job completion.
- **Habit tracker:** Mandatory shower + custom daily tasks with streak tracking.
- **AI Dispatcher:** Gemini 2 chat integration for route advice.
- **AI Operations Assistant:** 22-file assistant system with floating chat bubble, tool registry, server-side Gemini integration, and 10 tools (navigation, shower gate, jobs, battery, weather, travel, proof, debug).
- **Safety News:** Bakersfield area crime/safety via Google News RSS.
- **Screenshot OCR import:** Extract job data from screenshots.
- **Per-job Preview Guide:** Local screen-recording extraction, offline ordered pages, selected-page authenticated summary/review, generated Get Ready confirmations, explicit navigation/Transit handoff, and manual arrival/job-guide handoff.
- **Text-to-speech:** Gemini, OpenAI, ElevenLabs providers.
- **Debug Center:** Diagnostics and system status.
- **Supabase authentication:** Magic link and email/password login.
- **Self-hosted error reporting:** Privacy-safe client reporter (`src/services/errorReporter.ts`) captures window errors/unhandled rejections, batches them, and flushes to authenticated `POST /api/errors`; reports land in `.local-error-reports/reports.json`. Opt-out toggle + "Send Test Error" live in Debug Center. Bounded/sanitized; no third-party service.
- **Railway deployment:** Autodeploy from main branch.
- **Cloudflare Worker API variant:** Alternative backend deployment.
- **Checkpoint and release scripts:** `scripts/checkpoint.cjs`, `scripts/release.cjs`.
- **Knowledge system:** This documentation directory.
- **Official app icon:** Preserved source artwork and generated iPhone Safari/Home Screen plus favicon PNG assets.
- **Inventory custody first slice:** Job-detail camera-first receive-in with part/serial/photo/document capture, automatic time/GPS, receive/install/removal/return event chain, receipt/tracking return linkage, local offline queue, and Background Sync wake-up.
- **Transit Mode (official Transit API):** Backend-proxied integration with Transit app v4 — server `server/transit/` (router, service, client, cache, 5/min rate limiter, durable 1,500/month budget store persisted to `.local-transit-usage/usage.json`) mounted at `/api/transit` behind `requireAuth`; frontend gated by `VITE_TRANSIT_PROVIDER=transit`; UI in `src/components/transit/` (nearby stops, live arrivals, trip planner, favorites, alerts, job trip section, dashboard card, Settings diagnostic incl. monthly budget). Key stays server-side. Nearby radius is clamped 100–1500 m; trip-plan walk legs are overview-only (`coordinatesAvailable: false`); ride legs use plan offsets/schedule items for exact rider stops and visibly label inferred/unavailable fallbacks. Depends on Railway env `TRANSIT_API_KEY`; without it the Tools tab shows a fallback callout.

## Infrastructure

- Frontend: Vite + React + TypeScript + Tailwind CSS.
- Backend: Express.js server bundled with esbuild.
- Alternative backend: Cloudflare Worker.
- Database: Cloudflare D1 (for proofs) + Supabase (for auth).
- Hosting: Railway (production) + Cloudflare Workers (alternative).
- Latest checkpoint: `checkpoint-2026-07-21-remove-road-card-slab` (SHA cef52e5).

---

**Last Updated:** 2026-08-03 (Road Readiness rules)
