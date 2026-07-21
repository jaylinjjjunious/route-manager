# Deployment Workflow

## Production Deployment Steps

1. Ensure lint and build pass locally (`npm run verify`).
2. Commit changes to the `main` branch with a descriptive message.
3. Push to the `github` remote (`main` branch).
4. Railway Autodeploy detects the push and triggers a build.
5. Verify the deployment with `railway deployment list`.
6. Check the health endpoint at `/api/health` on the deployed instance.
7. If Autodeploy fails, use the fallback: `railway up`.

## Autodeploy Details

- Railway watches the `main` branch on the `github` remote.
- Every push to main triggers an automatic build and deploy.
- The build uses nixpacks with Node.js 22.16.
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

---

**Last Updated:** 2026-07-20 (c12bd44)
