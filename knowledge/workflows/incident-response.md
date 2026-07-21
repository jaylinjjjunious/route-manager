# Incident Response

## Build Failure

- Check `npm run lint` output for TypeScript errors.
- Fix type issues in the flagged files.
- Re-run `npm run verify` to confirm the fix.
- If the issue is a dependency problem, check `package.json` versions.

## Deployment Failure

- Check Railway logs: `railway logs --service route-optimizer-app`.
- Verify that all required environment variables are set in Railway.
- Confirm the nixpacks build completed successfully.
- If Autodeploy did not trigger, push again or use `railway up`.

## Auth Failure

- Check the Supabase project status in the Supabase dashboard.
- Verify the `JWT_SECRET` environment variable is set correctly.
- Confirm the `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct.
- Check that the Supabase service is not rate-limiting or down.

## Camera Failure

- Check that the app is served over HTTPS (required on mobile browsers).
- Verify the browser has granted camera permission.
- On iOS Safari, confirm `playsInline` attribute is set on the video element.
- Check for JavaScript errors in the browser console.

## Upload Failure

- Check backend connectivity (Express or Cloudflare Worker).
- Verify the upload endpoint is reachable and authenticated.
- Confirm the Supabase token is not stale (refresh may be needed).
- Check server disk space for Express-based uploads.

## Data Loss

- Restore from the most recent checkpoint tag:
  ```bash
  git tag -l "checkpoint-*"
  git restore --source <tag> -- path/to/file
  ```
- Or restore from the `latest-safe-app-baseline` tag referenced in `RESTORE_POINT.md`.
- localStorage data is not recoverable once cleared — there is no backup mechanism.

## Monitoring

- There is no automated monitoring or alerting configured.
- Health endpoint: `GET /api/health` returns 200 OK.
- Railway provides basic deployment status and logs.
- No error tracking service (Sentry, etc.) is integrated.

---

**Last Updated:** 2026-07-20 (c12bd44)
