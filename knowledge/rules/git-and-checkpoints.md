# Git and Checkpoint Rules

## Branching

- **Primary branch:** `main` — production-ready code only.
- Feature branches: `feature/description` or `fix/description`.
- Recovery branches: `recovery/<reason>` from a stable checkpoint.

## Remote

- Remote name: `github`
- URL: `https://github.com/jaylinjjjunious/route-manager.git`

## Commit Rules

- Always run `npm run lint && npm run build` before committing.
- Write descriptive, lowercase commit messages.
- Stage only intended files — never commit secrets or temporary files.
- Do not skip git hooks or amend commits unless explicitly asked.

## What to Never Commit

- `.env` files
- Secrets, tokens, or API keys
- Private proof images
- Local databases
- Upload folders
- `node_modules/`

## Checkpoint Tags

- Format: `checkpoint-YYYY-MM-DD-short-description`
- Must be annotated tags (`git tag -a`).
- Require a clean working tree and passing lint + build.
- Never move or overwrite an existing checkpoint tag.

### Creating a Checkpoint

```bash
npm run checkpoint
git push origin checkpoint-YYYY-MM-DD-description
```

### Manual Checkpoint

```bash
git tag -a checkpoint-YYYY-MM-DD-description -m "Stable checkpoint: description"
git push origin checkpoint-YYYY-MM-DD-description
```

## Push Rules

- **Never use `git push --force`** — this can destroy shared history.
- Push tags separately: `git push origin <tag-name>`.
- Verify remote matches local after push: `git log --oneline -1` vs `git log --oneline -1 origin/main`.

## Risky Changes

- Identify the most recent stable checkpoint before starting.
- Create a branch from the checkpoint for risky work.
- Do not make large experimental changes directly on main unless explicitly requested.

---

**Last Updated:** 2026-07-20 (c12bd44)
