# Current Implementation State

## Phase

**Phase 2 active.** Core features are built and deployed. Phase 3 (server sync, multi-user, team dashboard) has not started.

## Features Built

- **6-tab navigation:** Dashboard, Jobs, Battery, Tracker, Habits, Settings — with protected tab support.
- **Daily Shower Gate:** Barcode scan + proof upload + cycle management with 6:00 AM reset remain implemented, but access enforcement is temporarily bypassed by SHOWER_GATE_REQUIRED = false in src/App.tsx.
- **Job system:** 5 types, 7 statuses, completion workflow, proof vault.
- **Route optimization:** Nearest-neighbor algorithm, battery-aware, outlier detection.
- **Dashboard route interface:** Dashboard is the authoritative route-planning and route-management surface; the standalone Route page has been retired. Today's Route cards open compact per-job detail panels from the card surface.
- **Ride Mode:** Distraction-free execution surface for job completion.
- **Habit tracker:** Mandatory shower + custom daily tasks with streak tracking.
- **AI Dispatcher:** Gemini 2 chat integration for route advice.
- **AI Operations Assistant:** 22-file assistant system with floating chat bubble, tool registry, server-side Gemini integration, and 10 tools (navigation, shower gate, jobs, battery, weather, travel, proof, debug).
- **Safety News:** Bakersfield area crime/safety via Google News RSS.
- **Screenshot OCR import:** Extract job data from screenshots.
- **Text-to-speech:** Gemini, OpenAI, ElevenLabs providers.
- **Debug Center:** Diagnostics and system status.
- **Supabase authentication:** Magic link and email/password login.
- **Railway deployment:** Autodeploy from main branch.
- **Cloudflare Worker API variant:** Alternative backend deployment.
- **Checkpoint and release scripts:** `scripts/checkpoint.cjs`, `scripts/release.cjs`.
- **Knowledge system:** This documentation directory.
- **Official app icon:** Preserved source artwork and generated iPhone Safari/Home Screen plus favicon PNG assets.
- **Inventory custody first slice:** Job-detail camera-first receive-in with part/serial/photo/document capture, automatic time/GPS, receive/install/removal/return event chain, receipt/tracking return linkage, local offline queue, and Background Sync wake-up.
- **Transit Mode (official Transit API):** Backend-proxied integration with Transit app v4 — server `server/transit/` (router, service, client, cache, 5/min rate limiter) mounted at `/api/transit` behind `requireAuth`; frontend gated by `VITE_TRANSIT_PROVIDER=transit`; UI in `src/components/transit/` (nearby stops, live arrivals, trip planner, favorites, alerts, job trip section, dashboard card, Settings diagnostic). Key stays server-side. Depends on Railway env `TRANSIT_API_KEY`; without it the Tools tab shows a fallback callout.

## Infrastructure

- Frontend: Vite + React + TypeScript + Tailwind CSS.
- Backend: Express.js server bundled with esbuild.
- Alternative backend: Cloudflare Worker.
- Database: Cloudflare D1 (for proofs) + Supabase (for auth).
- Hosting: Railway (production) + Cloudflare Workers (alternative).
- Latest checkpoint: `checkpoint-2026-07-21-remove-road-card-slab` (SHA cef52e5).

---

**Last Updated:** 2026-07-30 (integrate-official-transit-api)
