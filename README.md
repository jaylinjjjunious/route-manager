# Route Manager

Route Manager is a mobile-first field-work application for route planning, delivery jobs, proof capture, battery-aware routing, habit tracking, and operational assistance. The app is in Phase 2: core features are deployed; server sync, multi-user support, and team dashboards are not started.

## Current State

- Production branch: `main`
- GitHub remote: `github` -> `https://github.com/jaylinjjjunious/route-manager.git`
- Railway project/service/environment: `route-optimizer-app` / `route-optimizer-app` / `production`
- Last committed release: `6a8bba7` (`Document Smart Aisle production verification`)
- Last verified Railway deployment: `3d47e332-e3c1-4770-8850-cd4e578f9d05` (SUCCESS)
- Production build endpoint: `https://route-optimizer-app-production.up.railway.app/api/build-info`
- Real-device verification route: `/real-device-verification?access=smart-aisle-iphone`
- The working tree currently contains uncommitted Smart Aisle changes. They are not in production yet.

The current local work adds immediate photo removal with undo and Recently Removed recovery, sequence restoration and restitching, rolling lens-cleanliness analysis, setup and in-capture lens checks, high-confidence capture blocking, privacy-safe verification events, and unit tests for image analysis and photo storage. The related knowledge files are already updated in the working tree.

Open verification items are real iPhone Safari/Home Screen PWA evidence for deletion, undo, restitching, lens checks, and capture blocking, plus an authenticated production pass confirming Test Lab data isolation. Lens thresholds also need controlled smudge-sample calibration on a real device.

## Architecture

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons
- Backend: Express, bundled with esbuild from `server.ts`
- Authentication: Supabase magic link and email/password
- Storage: Cloudflare D1 for proofs and Supabase for authentication
- Primary hosting: Railway; alternate Cloudflare Worker/Vinext path is retained
- Main app entry: `src/App.tsx` and `src/main.tsx`
- Smart Aisle implementation: `src/components/SmartAisleScan.tsx`
- Smart Aisle verification panel: `src/components/RealDeviceVerification.tsx`
- Scan services: `src/services/scan/`
- Browser harness: `tests/smart-aisle-test-lab-ui-check.cjs`

## Local Development

Prerequisites: Node.js 22 or compatible current Node, npm, and the repository environment variables. Copy `.env.example` to a local environment file and provide the required values; never commit `.env` files or tokens.

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm run lint                 # TypeScript check
npm run build                # Vite frontend plus Express server bundle
npm test                     # Vitest unit tests; do not pass Jest --runInBand
npm run test:habits          # Habit UI check
npm run test:smart-aisle-lab # Smart Aisle local browser harness
npm run verify               # Project verification script
```

Camera testing requires HTTPS and a real mobile browser for meaningful results. Use the protected real-device route for iPhone Safari and installed PWA evidence. The Test Lab is a local development feature controlled by `VITE_ENABLE_SMART_AISLE_TEST_LAB`; production builds must not expose its UI.

## Production Workflow

Before coding, read `knowledge/README.md`, load the relevant knowledge documents, inspect the related source, and report documentation/code conflicts before editing. Preserve unrelated working-tree changes.

For a completed application change:

1. Run `npm run lint` and `npm run build`; run focused tests as applicable.
2. Review `git diff` and `git status`.
3. Update affected knowledge and memory documents.
4. Commit with a descriptive message on `main` unless the change is risky; use a feature branch for risky work.
5. Push with `git push github main`.
6. Confirm the remote SHA with `git ls-remote --heads github main`.
7. Check `railway deployment list` and verify `/api/build-info` plus the relevant public route.
8. Only call the change live after the public domain reports the new commit.

Use `railway up` only when Railway autodeploy is unavailable. Do not use `railway redeploy` for new source changes, and never force-push. Do not commit secrets, private proof images, local databases, upload folders, or generated evidence.

## Resume Instructions

The next developer or AI should begin with:

```sh
git status --short --branch
git diff --stat
git diff -- knowledge src tests package.json
```

Treat the existing uncommitted Smart Aisle changes as intentional user work. Read the changed source and the corresponding knowledge files before modifying them. Then run `npm test`, `npm run lint`, `npm run build`, and `npm run test:smart-aisle-lab` as appropriate. Fix or review failures, complete the real-device and authenticated isolation checks, update the knowledge memory, and only then commit, push, deploy, and verify production. Do not reset, checkout, or discard the current changes without explicit authorization.

## Project Memory

The authoritative project context is in `knowledge/`. Start with:

- `knowledge/memory/current-state.md`
- `knowledge/memory/current-priorities.md`
- `knowledge/memory/known-bugs.md`
- `knowledge/memory/lessons-learned.md`
- `knowledge/workflows/testing.md`
- `knowledge/workflows/deployment.md`
- `AGENTS.md`
