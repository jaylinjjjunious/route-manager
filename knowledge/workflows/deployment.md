# Deployment Workflow

## Current Hosting

- Render is the primary Node/Express production host. Its Blueprint configuration is
  stored in `/render.yaml` and deploys the `main` branch automatically.
- Production URL: `https://route-manager-phtj.onrender.com`.
- Render service ID: `srv-da7qimgu01pc73bmpo40`.
- The initial Render deploy of commit `61ee690` was verified Live on 2026-08-26;
  the public sign-in page loaded and `/api/health` returned `status: ok`.
- Keep Railway available as a temporary rollback host until signed-in production
  authentication and protected API calls are verified on Render.
- Render build command: `npm ci && npm run build`.
- Render start command: `npm start`.
- Render health check: `/api/health`.
- Node.js is pinned to `22.16.0` through `NODE_VERSION`.
- Secrets marked `sync: false` in `render.yaml` must be entered in the Render
  dashboard and must never be committed.
- The free Render filesystem is ephemeral. Proof files, error reports, and
  Transit usage data written locally are not durable across restarts or
  spin-downs; P002 remains open until those writes move to durable storage or a
  paid persistent disk is configured.

## Production Deployment Steps

1. Ensure lint and build pass locally (`npm run verify`).
2. Commit changes to the `main` branch with a descriptive message.
3. Push to the `github` remote (`main` branch).
4. Render detects the push and triggers a Blueprint-managed deployment.
5. Verify that the new Render deploy is marked Live.
6. Check `https://route-manager-phtj.onrender.com/api/health` and the relevant
   public application route.
7. Only call the change live after Render reports the pushed commit and the
   public checks pass.

## Autodeploy Details

- Render watches the `main` branch on the GitHub repository.
- Every push to main triggers an automatic build and deploy.
- The build uses `npm ci && npm run build` with Node.js 22.16.
- No manual deployment command is needed under normal conditions.

## Commit Verification

After pushing, verify that the local and remote commits match:

```bash
git log --oneline -1
git log --oneline -1 origin/main
```

Both should show the same SHA.

## Railway Status Check

```bash
railway status
railway logs --service route-optimizer-app
```

## Fallback Deployment

If Autodeploy does not trigger or fails:

```bash
railway up
```

This uploads the current code directly. Do not use `railway redeploy` for new source changes — it only redeploys the last uploaded code.

## Environment

- Railway project: `route-optimizer-app`
- Railway service: `route-optimizer-app`
- Environment: `production`

## Transit API Environment Variables

| Variable | Scope | Value |
|----------|-------|-------|
| `TRANSIT_API_KEY` | Server runtime | Official Transit API key (never `VITE_`-prefixed) |
| `TRANSIT_API_BASE_URL` | Server runtime | `https://external.transitapp.com/v4` |
| `TRANSIT_NETWORK_IDS` | Server runtime | `GET\|Bakersfield` (pipe-separated) |
| `VITE_TRANSIT_PROVIDER` | **Build time** | `transit` |

Notes:

- `VITE_TRANSIT_PROVIDER` is baked into the frontend bundle at build time (`import.meta.env`), so it must be present when Railway runs the Vite build. `TRANSIT_API_KEY`, `TRANSIT_API_BASE_URL`, and `TRANSIT_NETWORK_IDS` are read at runtime by the server.
- Never create a `VITE_TRANSIT_API_KEY` variable — the key must stay server-side. `tests/transitKeyHygiene.test.ts` enforces this.
- With `VITE_TRANSIT_PROVIDER` unset/empty the Transit UI is hidden; the server endpoints still respond (503 `TRANSIT_NOT_CONFIGURED` without a key).

## Apple iOS Wrap Workflow

1. Pushing to `main` branch or opening a pull request automatically triggers `.github/workflows/apple-wrap.yml`.
2. The GitHub Actions job runs on `macos-latest`, compiles the frontend bundle via `npm run build`, and syncs assets to `ios/App/App/public` using `npx cap sync ios`.
3. `xcodebuild` creates `build/App.xcarchive` which is zipped and uploaded to GitHub Actions Artifacts as `apple-ios-archive`.
4. Download the `apple-ios-archive` zip from the GitHub Actions run summary page for Xcode distribution or simulator testing.

---

**Last Updated:** 2026-08-15 (apple-ios-wrap-github-actions)
