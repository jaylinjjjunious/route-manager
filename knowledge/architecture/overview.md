# Architecture Overview

## Purpose

Describes the complete system architecture of All in One 667, a field-work mission control application for e-bike gig workers. The app provides route optimization, job management, daily shower gate verification, battery tracking, habit tracking, AI-powered dispatch, and safety monitoring.

## Current Implementation

All in One 667 is a single-page React application served by an Express backend with Supabase authentication. The app is deployed on Railway using nixpacks and also has a Cloudflare Workers variant for the API layer.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| Backend | Express 4 (Node 22), multer for file uploads |
| Auth | Supabase (email/password, JWT session) |
| Database | Cloudflare D1 (SQLite) via worker, local JSON files |
| AI | Google Gemini 2 (chat, OCR, TTS) |
| Deployment | Railway (main), Cloudflare Sites (worker) |
| Languages | TypeScript throughout |
| Icons | lucide-react |
| Barcode | Native BarcodeDetector API + @zxing/browser fallback |
| Image opt | vinext/image for Cloudflare |

### Repository Structure

```
route-optimizer-app/
  src/
    App.tsx              — Main application (5837 lines)
    main.tsx             — Entry point, auth boot
    index.css            — Global styles, Tailwind
    types.ts             — Shared types
    auth/
      AuthProvider.tsx   — Supabase auth context
      ProtectedApp.tsx   — Auth guard, login routing
    components/
      ShowerGatePanel.tsx — Daily barcode verification (in features/showerGate/)
      Header.tsx         — App header
      JobCard.tsx, JobModal.tsx
      AIDispatcher.tsx
      JobImportSystem.tsx
      EndOfDaySummary.tsx
      settings/DebugCenter.tsx
    hooks/
      useTextToSpeech.ts
    services/
      apiClient.ts       — Auth-fetch wrapper
    features/
      battery/
        BatteryTab.tsx    — Presentational legacy Battery tab UI
        useBattery.ts     — E-bike state, persistence, actions, learned efficiency
        batteryUtils.ts   — Default Jasion EB5 config and pure battery calculations
      routePlanning/
        BakersfieldMapPreview.tsx
        RouteSummaryCard.tsx
        RouteScoreGauge.tsx
        OutlierDetector.tsx
        routeUtils.ts      — Route optimization, metrics
        useRoutePlanning.ts — Route state, derived values, monitor, simulation
        types.ts           — Route-planning feature types
      showerGate/
        showerProofApi.ts  — Proof upload/fetch API
      habits/HabitsTab.tsx — Presentational Habits tab UI (state lives in App.tsx)
    utils/
      showerCycle.ts     — Reset time, cycle ID, labels
      routeUtils.ts      — Route utility compatibility re-export shim
      geoUtils.ts        — Shared coordinate distance helper
      jobState.ts        — Job state normalization
      voiceProviders.ts  — TTS provider selection
    lib/
      supabase.ts        — Supabase client singleton
  server.ts              — Express backend (724 lines)
  worker/index.ts        — Cloudflare Worker API (700 lines)
  db/schema.ts           — SQL schema definition
  drizzle/               — SQL migrations
  scripts/               — verify, checkpoint, release helpers
  docs/                  — Legacy documentation
  knowledge/             — Current knowledge system
```

### Data Flow

1. User authenticates via Supabase (email/password).
2. Auth session is stored in-memory (AuthProvider) and localStorage (Supabase).
3. App.tsx loads jobs, habits, shower proof state from localStorage on mount.
4. Shower gate checks backend via `/api/shower-proofs/current` for the current cycle.
5. User uploads shower proof via POST `/api/shower-proofs` (multer on Express, FormData on Worker).
6. Route optimization runs entirely client-side (nearest-neighbor greedy algorithm).
7. Job completions are stored in localStorage with proof vault attachments.
8. AI Dispatcher sends chat history to Gemini 2 for route advice.
9. Safety news fetches Google News RSS for the Bakersfield area.
10. Habit state syncs with backend via `/api/habits` (GET/PUT).

### State Management

No external state library. App.tsx uses React useState and useRef for all state:

- `jobs`, `routeOrder` — Job list and optimized route order
- `proofVault` — Proof attachments per job
- `showerProofs` — Array of shower proof records per cycle
- `habitTasks`, `habitLogs` — Habit tracking state
- `rideModeActive` — Whether Ride Mode is engaged
- `currentTab` — Active navigation tab

### Runtime Entry Points

| Entry | Purpose |
|-------|---------|
| `src/main.tsx` | Renders StartupScreen → AuthProvider → ProtectedApp |
| `src/App.tsx` | Main application component (7 tabs) |
| `server.ts` | Express server for Railway (port 3000) |
| `worker/index.ts` | Cloudflare Worker for sites deployment |

### Build Pipeline

```
npm run build
  → vite build (standalone config → dist/)
  → esbuild bundle server.ts → dist/server.cjs
```

```
npm run dev
  → vinext dev (Vite dev server with HMR)
```

## Related Source Files

- `src/App.tsx` — Main application
- `src/main.tsx` — Entry point
- `server.ts` — Express backend
- `worker/index.ts` — Cloudflare API worker

## Related Knowledge

- `architecture/frontend.md` — Frontend architecture details
- `architecture/backend.md` — Backend architecture details
- `architecture/authentication.md` — Auth implementation
- `architecture/deployment.md` — Deployment configuration

## Last Updated

2026-08-08 — battery extraction Step 2 moved Battery-owned state, persistence, calculations, default e-bike config, and learning logic into `src/features/battery/`.
