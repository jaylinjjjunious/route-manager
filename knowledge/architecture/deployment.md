# Deployment Architecture

## Purpose

Describes how the application is built, deployed, and hosted across Railway and Cloudflare.

## Current Implementation

### Primary Deployment: Railway

**Branch:** `main`
**Builder:** nixpacks (Node 22.16.0)
**Config:** `railway.toml`, `nixpacks.toml`

**Build pipeline:**
```
npm ci
npm run build
  → vite build (standalone, outputs to dist/)
  → esbuild bundle server.ts → dist/server.cjs
```

**Start command:** `node dist/server.cjs` (starts Express server on port 3000)

**Health check:** GET `/api/health` (300s timeout)
**Restart policy:** On failure (max 3 restarts)

**nixpacks.toml:**
- Pins Node 22.16.0 (curl + xz extraction)
- Sets PATH to include `/usr/local/bin`

### Secondary Deployment: Cloudflare Sites

The project also supports Cloudflare Workers via `vite.config.ts` using `@cloudflare/vite-plugin` with D1 and R2 bindings. This path uses `vinext dev` for local development.

### Railway Autodeploy

Railway detects pushes to `main` branch and automatically starts a build. The `railway up` command is a fallback when Autodeploy is unavailable. `railway redeploy` redeploys the last uploaded code (not new source changes).

### Production Commands

```sh
# Deploy from local
git push origin main

# Check deployment status
railway status
railway deployment list

# Fallback deploy (when Autodeploy is unavailable)
railway up
```

### Apple iOS Wrap (GitHub Actions)

The app is wrapped into a native Apple iOS workspace via **Capacitor** (`@capacitor/core`, `@capacitor/ios`).
- **Configuration:** `capacitor.config.ts` (`appId: 'com.allinone667.routeoptimizer'`, `webDir: 'dist'`).
- **iOS Workspace:** `ios/App/App.xcworkspace`.
- **CI/CD Pipeline:** `.github/workflows/apple-wrap.yml` runs on `macos-latest`, compiles the web application, syncs Capacitor iOS assets, builds an Xcode archive (`App.xcarchive`), and uploads the zipped `.xcarchive` artifact to GitHub Actions.

### Environment Variables

Set in Railway dashboard or `.env` file:

| Variable | Required | Source |
|----------|----------|--------|
| `GEMINI_API_KEY` | Yes | Google AI Studio |
| `SUPABASE_JWT_SECRET` | Yes | Supabase dashboard |
| `VITE_SUPABASE_URL` | Yes | Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase project |
| `APP_URL` | No | Custom domain |
| `GOOGLE_MAPS_PLATFORM_KEY` | No | Google Cloud |
| `OPENAI_API_KEY` | No | OpenAI |
| `ELEVENLABS_API_KEY` | No | ElevenLabs |

## Related Source Files

- `railway.toml` — Railway deployment config
- `nixpacks.toml` — Build environment config
- `capacitor.config.ts` — Capacitor iOS wrap config
- `.github/workflows/apple-wrap.yml` — GitHub Actions iOS wrap workflow
- `vite.config.ts` — Cloudflare/Vinext config
- `vite.config.standalone.ts` — Standalone build config
- `server.ts` — Express server entry
- `scripts/release.cjs` — Release workflow script
- `scripts/checkpoint.cjs` — Checkpoint script

## Related Knowledge

- `workflows/deployment.md` — Step-by-step deployment workflow
- `workflows/rollback.md` — Rollback procedures

## Last Updated

2026-08-15 (apple-ios-wrap-github-actions)
