# Architecture Overview

## Cleaning account plans (2026-10-21)

Cleaning retains an independent frontend/build and owns a Supabase client. Its full validated plan is persisted in owner-scoped cloud storage with read RLS, a revision-checked authenticated save function, offline account caches and explicit legacy import/conflict recovery. No hallway or Route Manager implementation import. Details: ../features/cleaning-planner.md.

## Cleaning room (2026-10-20)

Cleaning is the third independent workspace at apps/cleaning, linked by URL from hallway at /cleaning/. It owns its React UI, local plan, tests and static build. Gateway serves its files without Route Manager imports, authentication or API access. See ../features/cleaning-planner.md.

## Purpose

Describes the complete system architecture of All in One 667, a field-work mission control application for e-bike gig workers. The app provides route optimization, job management, daily shower gate verification, battery tracking, habit tracking, AI-powered dispatch, and safety monitoring.

## Current Implementation

All in One is now a parent repository containing independent hallway and Route Manager apps. Each has its own package, source, tests and build. The hallway links to the room through a URL; it does not import room code. A root Node gateway serves the hallway and proxies the separately running Route Manager Express process on the existing Render domain. Route Manager retains Supabase authentication and its existing business/storage contracts. See root README and the independent-app-workspaces ADR.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| Backend | Express 4 (Node 22), multer for file uploads |
| Auth | Supabase (email/password, JWT session) |
| Database | Cloudflare D1 (SQLite) via worker, local JSON files |
| AI | Google Gemini 2 (chat, OCR, TTS) |
| Deployment | Render parent composition; Railway rollback; legacy Cloudflare variant |
| Languages | TypeScript throughout |
| Icons | lucide-react |
| Barcode | Native BarcodeDetector API + @zxing/browser fallback |
| Image opt | vinext/image for Cloudflare |

### Repository Structure

```
apps/route-manager/
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
      proofVault/
        ProofVaultModal.tsx — Selected proof folder modal UI
        useProofVault.ts    — Per-job proof state, persistence, mutations, selection
        types.ts            — Proof asset and record types
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
  scripts/               — Room screenshot utility (root scripts own verification/releases)
  docs/                  — Legacy documentation
  # Knowledge and project workflow documents remain at the repository root.
```

### Data Flow

1. User authenticates via Supabase (email/password).
2. Auth session is stored in-memory (AuthProvider) and localStorage (Supabase).
3. Feature hooks load jobs, habits, shower proof state, and per-job Proof Vault state from localStorage on mount.
4. Shower gate checks backend via `/api/shower-proofs/current` for the current cycle.
5. User uploads shower proof via POST `/api/shower-proofs` (multer on Express, FormData on Worker).
6. Route optimization runs entirely client-side (nearest-neighbor greedy algorithm).
7. Job completions are stored in localStorage with proof vault attachments.
8. AI Dispatcher sends chat history to Gemini 2 for route advice.
9. Safety news fetches Google News RSS for the Bakersfield area.
10. Habit state syncs with backend via `/api/habits` (GET/PUT).

### State Management

No external state library. `App.tsx` remains the shell/orchestrator, with extracted feature hooks owning focused state:

- `jobs`, `routeOrder` — Job list and optimized route order
- `useProofVault` — Proof attachments per job
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

2026-08-08 — Proof Vault extraction Step 2 moved per-job proof state, persistence, mutations, selected record state, and completed-job backfill into `src/features/proofVault/useProofVault.ts`.
