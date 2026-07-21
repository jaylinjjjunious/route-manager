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
- `vite.config.ts` — Cloudflare/Vinext config
- `vite.config.standalone.ts` — Standalone build config
- `server.ts` — Express server entry
- `scripts/release.cjs` — Release workflow script
- `scripts/checkpoint.cjs` — Checkpoint script

## Related Knowledge

- `workflows/deployment.md` — Step-by-step deployment workflow
- `workflows/rollback.md` — Rollback procedures

## Last Updated

2026-07-20 (c12bd44)
