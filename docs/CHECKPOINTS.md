# Checkpoints

Recoverable milestones for the Route Optimizer project.

| Tag | Date | SHA | Stable Features | Known Issues | Deployment | Restore Command |
|-----|------|-----|-----------------|--------------|------------|-----------------|
| checkpoint-2026-07-19-full-app-stable | 2026-07-19 | 397cdd0 | Auth (login/logout/refresh), route planning, vehicle management, shower gate, barcode scanner, mission control, mobile UI, AI chat, Express server, Supabase backend, Railway hosting | Old backup tags exist (pre-checkpoint format). ChatGPT origin remote is secondary. | Railway fallback deploy (`railway up`) | `git show checkpoint-2026-07-19-full-app-stable` |

## Restore Commands

View a checkpoint:

```bash
git show checkpoint-2026-07-19-full-app-stable
```

Create a recovery branch from a checkpoint:

```bash
git switch -c recovery/full-app-stable checkpoint-2026-07-19-full-app-stable
```

Restore one file from a checkpoint:

```bash
git restore --source checkpoint-2026-07-19-full-app-stable -- path/to/file
```

Do not recommend resetting main destructively as the first recovery method.
