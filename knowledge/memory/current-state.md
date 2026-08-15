# Current Implementation State

## Phase

**Phase 2 active.** Core features are built and deployed. Phase 3 (server sync, multi-user, team dashboard) has not started.

## Phase 1 Scheduling

Implemented on top of the existing job system:
- `Job.scheduledDate?: string` — local workday `YYYY-MM-DD` in `America/Los_Angeles` (never UTC).
- Mission Control dashboard gains the weekly strip (`WeeklyStrip`), expanded day panel (`ExpandedDayPanel`), and move-to-day sheet (`MoveToDaySheet`).
- Today's Route pool = Route A jobs with `effectiveDay === today`; future-dated jobs live on standby (Route B).
- Legacy `jobs_moved_to_tomorrow` migrated to per-job `scheduledDate` (schema v4); current job storage schema is v5 with a backward-compatible optional lifecycle overlay.
- Weather/AQ (Phase 2 of scheduling) and TTS companion (Phase 3 of scheduling) remain planned; strip shows `◌` placeholders.

## Features Built

- **AIØ three-tab navigation (Today / Jobs / More):** iOS-style redesign of the primary interface. The former Mission Control dashboard is now the **Today** readiness screen (Road Readiness + Next Best Job/Current Job, Today's Other Jobs, Travel Plan, This Week strip). Road Readiness requires a reviewed Preview Guide for every actionable job, applies exact wind gating, and keeps battery informational. The compact dark Road Readiness panel shows live current weather top-left (sun/moon glyph, temperature, condition, feels-like) from Open-Meteo with permission-respecting location and offline/denied fallbacks; live weather is display-only and never gates readiness. **Jobs** is the schedule list (today, later days, Route B standby, overdue/unscheduled review), and **More** is the hub for all legacy tabs (Inventory, Battery, Tracker, Habits, Tools, Settings) plus Proof Vault, Add Process Serve, Import Screenshots, Debug Center, account, theme, and Sign Out. New AIØ design tokens (`--color-aio-*`) and primitives in `src/components/aio/`. Dev-only screenshot mode (`VITE_TODAY_SCREENSHOT_MODE`) and `scripts/screenshot-today.mjs` for headless layout verification (320/390/430 px, dark/light).
- **6-tab navigation:** Inventory, Battery, Tracker, Habits, Tools, Settings — now reachable from the More screen, with protected tab support.
- **Daily Shower Gate:** All shower gate state, effects, scanner lifecycle, barcode detection, and proof sync have been extracted into `useShowerGate` (`src/features/showerGate/useShowerGate.ts`). The UI section is in `ShowerGateSection` (`src/features/showerGate/ShowerGateSection.tsx`). Shared types live in `src/features/showerGate/types.ts`. `src/App.tsx` orchestrates the hook and retains only cross-cutting habit/dispatcher wiring. Access enforcement remains temporarily bypassed by `SHOWER_GATE_REQUIRED = false`.
- **Job system:** 5 types, legacy statuses, completion workflow, proof vault, and optional v1 lifecycle state normalized at load/storage while `JobStatus` remains authoritative. `useJobs` exposes persisted lifecycle transition actions for check-in, work state changes, visit ending, work-complete pending closeout, closeout completion, and reopen. `JobDetailModal` opens with a lifecycle-aware Job Overview and derived Next Action card; check-in, ready/start, pause/resume, awaiting-support, blocked-onsite, end-visit, Work Complete, Closeout, and Reopen actions are wired with mobile note sheets where needed. Compact Time Summary derives onsite, active-work, paused, support, and blocked timing from lifecycle events/state, including active visits through now. Work Complete stops active onsite/work timing, keeps the legacy job open, removes active-work controls, and shows Closeout as the next action. The generic Closeout Gate foundation evaluates job-attached required, conditional, recommended, and reference requirements; missing required/active-conditional items block the Complete Job button, while recommended/reference items do not. Customer-specific closeout rules remain deferred. Compact Visit History shows visit numbering, timestamps, end reasons, and stable visit IDs for later proof linking. A development-only lifecycle acceptance harness is available behind `VITE_ENABLE_JOB_LIFECYCLE_HARNESS=true` in dev builds and injects a resettable fake technician job without touching production seeds. Generic versioned procedure definitions now exist as a pure TypeScript model under `src/features/jobs/procedures/`, and jobs can carry an optional exact procedure ID/version assignment reference plus focused assignment history. Procedure selection UI and procedure-derived closeout requirements are not wired yet.
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
- **Official app icon:** Preserved source artwork and generated black/white AIØ favicon/PWA icon assets (`public/icons/aio-icon-192.png`, `public/icons/aio-icon-512.png`). The AIØ header brand mark is the `AIØ` text wordmark, not a logo image.
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

**Last Updated:** 2026-08-15 (Version-specific job procedure assignment added)
