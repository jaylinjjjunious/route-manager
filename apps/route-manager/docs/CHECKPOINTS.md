# Checkpoints

Recoverable milestones for the All in One 667 project.

| Tag | Date | SHA | Stable Features | Known Issues | Deployment | Restore Command |
|-----|------|-----|-----------------|--------------|------------|-----------------|
| checkpoint-2026-07-19-full-app-stable | 2026-07-19 | 65984c7 | Auth (login/logout/refresh), route planning, vehicle management, shower gate, barcode scanner, mission control, mobile UI, AI chat, Express server, Supabase backend, Railway hosting, deployment workflow, checkpoint system, Node 22.16 fix | Old backup tags exist (pre-checkpoint format). ChatGPT origin remote is secondary. | Railway autodeploy **ACTIVE** — SUCCESS at 2026-07-19 20:48 PDT | `git show checkpoint-2026-07-19-full-app-stable` |

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
