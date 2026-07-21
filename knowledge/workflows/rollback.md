# Rollback Procedures

## Identify a Stable Checkpoint

```bash
git tag -l "checkpoint-*"
```

This lists all checkpoint tags. Choose the most recent stable one.

## Full Rollback (Recovery Branch)

1. Create a recovery branch from the checkpoint tag:

```bash
git switch -c recovery/<reason> checkpoint-YYYY-MM-DD-description
```

2. Verify the branch builds:

```bash
npm run verify
```

3. Push the recovery branch and deploy from it, or merge into main.

## Single-File Restore

To restore a single file from a checkpoint:

```bash
git restore --source checkpoint-YYYY-MM-DD-description -- path/to/file
```

## Railway Rollback

1. List recent deployments:

```bash
railway deployment list
```

2. Note the deployment ID of a known-good deployment.
3. Redeploy that version:

```bash
railway deploy --id <deployment-id>
```

Or push the stable commit to main and let Autodeploy handle it.

## Safety Rules

- **Never use `git push --force`** — this can destroy shared history.
- For risky changes, always create a branch from a stable checkpoint first.
- The `RESTORE_POINT.md` file references the `latest-safe-app-baseline` tag for manual reference.
- Checkpoint tags are never moved or overwritten.

## Checkpoint Tag

Format: `checkpoint-YYYY-MM-DD-short-description`

Example: `checkpoint-2026-07-19-full-app-stable`

---

**Last Updated:** 2026-07-20 (c12bd44)
