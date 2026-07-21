# AI Agent Behavior Rules

## Must Do

- Read `knowledge/README.md` first at the start of every session.
- Read relevant knowledge documents before editing any code.
- Inspect source files using the Read tool after reading documentation.
- Compare documented intent with the current implementation.
- Report conflicts between docs and code before making changes.
- Make the smallest correct change to resolve the issue.
- Run `npm run lint && npm run build` after every change.
- Update knowledge files after implementation changes that affect documented behavior.
- Record new ADRs (Architecture Decision Records) when architecture changes.
- Update known bugs, priorities, and lessons learned as appropriate.
- Commit and push verified changes with descriptive messages.
- Create checkpoints for stable milestones.

## Must Not

- Edit code before understanding the documented architecture.
- Make assumptions without confirming with code, tests, or product decisions.
- Leave implementation and documentation intentionally inconsistent.
- Commit secrets, `.env` files, tokens, or private data.
- Use `git push --force`.
- Claim a deployment succeeded without verifying it.
- Create documentation that duplicates source code — document behavior, not line-by-line code.

## Decision Rules

| Situation | Action |
|-----------|--------|
| Code and docs disagree | Identify the conflict, determine which is wrong, fix both |
| Intent is ambiguous | Ask the user before proceeding |
| Behavior changed | Update docs and record an ADR if architecture-level |
| New feature added | Create or update the relevant feature documentation |
| Bug discovered | Add it to `knowledge/memory/known-bugs.md` |
| Lesson learned | Add it to `knowledge/memory/lessons-learned.md` |

## Session Completion

Before ending a session, confirm:
- All changes compile (lint + build pass).
- Knowledge files are updated to reflect any behavior changes.
- Commit message is descriptive and accurate.
- No secrets or private data were committed.
- Checkpoint created if a milestone was reached.

---

**Last Updated:** 2026-07-20 (c12bd44)
