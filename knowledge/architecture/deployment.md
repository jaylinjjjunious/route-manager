# Deployment Architecture

## Purpose

Render is the current primary production host; Railway is a rollback host and Cloudflare is an alternate build path.

## Current Implementation

### Primary Deployment: Render

**Branch:** `main`
**Builder:** nixpacks (Node 22.16.0)
**Config:** `render.yaml` (primary), `railway.toml` and `nixpacks.toml` (rollback)

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
git push github main

# Check deployment status
railway status
railway deployment list

# Fallback deploy (when Autodeploy is unavailable)
railway up
```

### Apple iOS Wrap (GitHub Actions)

2026-10-09 supersedes the billing blocker below: Mac simulator and unsigned device archive builds/upload pass in run 37864986666 attempt 3, using Xcode 26.6. Billing cleared and existing public client configuration installed as repository Actions variables. Actual native UI/device/signing and reviewed production deployment remain pending.

The app is wrapped into a native Apple iOS workspace via **Capacitor** (`@capacitor/core`, `@capacitor/ios`).
- **Configuration:** `capacitor.config.ts` (`appId: 'com.allinone667.routeoptimizer'`, `webDir: 'dist-native'`, iOS scheme `capacitor`).
- **iOS Project:** `ios/App/App.xcodeproj`, with Swift Package Manager dependencies. The previously documented top-level `.xcworkspace` does not exist.
- **CI/CD Pipeline:** `.github/workflows/apple-wrap.yml` runs on `macos-latest`, compiles the web application, syncs Capacitor iOS assets, builds an Xcode archive (`App.xcarchive`), and uploads the zipped `.xcarchive` artifact to GitHub Actions.
- **2026-10-08 draft:** Separate frontend-only build, native API routing/CORS, Browser plugin sync, permission strings and simulator artifact prepared on `codex/ios-wrap-readiness`. GitHub Actions is blocked by account billing; no native archive has been verified. See [iOS wrap guide](../../docs/IOS_WRAP.md).

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

## Render release verification (2026-09-26)

Render watches GitHub main. The public /api/build-info response now resolves RENDER_GIT_COMMIT before Railway/GIT_COMMIT_SHA fallbacks. Compare it with github/main before claiming the release is live. Railway-specific commands above apply only to the rollback host.
