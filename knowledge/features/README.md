# All in One 667 — Features Knowledge Base

Index of feature documentation for the All in One 667 application.

## Feature Documents

| Document | Description |
|----------|-------------|
| [Job System](./job-system.md) | Job-based field work management with proof vault, multiple types/statuses, and completion workflow |
| [Route System](./route-system.md) | Greedy nearest-neighbor route optimization, battery-aware planning, and distraction-free Ride Mode |
| [Habit Tracker](./habit-tracker.md) | Daily habit tracking with mandatory shower enforcement and custom task logging |
| [AI Dispatcher](./ai-dispatcher.md) | Gemini 2 chat for route/job advice, Bakersfield safety news, and TTS integration |
| [Screenshot Import](./screenshot-import.md) | OCR-based job import from screenshots via Gemini 2 vision |
| [Proof Vault](./proof-vault.md) | Per-job proof attachment system (photos, screenshots, receipts) |
| [Voice System](./voice-system.md) | Text-to-speech with Gemini/OpenAI/ElevenLabs providers |
| [Shower Gate](./shower-gate.md) | Mandatory shower verification before accessing protected tabs |

## App Overview

**Stack**: React 19 + TypeScript + Vite 8 + Tailwind v4 + Express backend

**Tabs**: Dashboard, Route, Jobs, Battery, Tracker, Habits, Settings

**Protected Tabs**: Route, Jobs, Battery, Tracker (require shower gate unlock)

**Key Architecture**:
- Single-page app with client-side routing
- localStorage for state persistence
- Backend API for OCR, safety news, TTS, and habit sync
- Gemini 2 for AI features (dispatcher, OCR)
- eBike battery-aware route planning

## Source Map

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app, state management, tab routing |
| `src/types.ts` | TypeScript type definitions |
| `src/utils/routeUtils.ts` | Route optimization algorithms |
| `src/utils/jobState.ts` | Job state normalization |
| `src/utils/showerCycle.ts` | Shower cycle timing logic |
| `src/components/` | UI components |
| `server.ts` | Express backend |
| `worker/index.ts` | Cloudflare Worker backend |

## Last Updated

2026-07-20 (commit c12bd44)
