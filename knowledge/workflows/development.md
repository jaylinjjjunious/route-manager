# Development Workflow

## AI Session Protocol

Every coding session must follow this sequence:

1. **Read knowledge** — Start with `knowledge/README.md` to understand project context.
2. **Load relevant docs** — Read knowledge files related to the task (features, rules, decisions).
3. **Inspect source files** — Use the Read tool to examine current implementation.
4. **Compare** — Identify differences between documented intent and actual code.
5. **Report conflicts** — If docs and code disagree, flag the conflict before editing.
6. **Change** — Make the smallest correct change to resolve the issue.
7. **Verify** — Run `npm run lint && npm run build` to confirm the change compiles.
8. **Update docs** — If behavior changed, update the affected knowledge files.
9. **Commit** — Write a descriptive commit message.
10. **Push** — Push to the main branch on the github remote.

## Standard Development Steps

1. Read the relevant knowledge documents before editing any code.
2. Inspect the source files using the Read tool.
3. Compare documented intent with the current implementation.
4. Make the smallest correct change.
5. Run lint (`npm run lint`) and build (`npm run build`).
6. Update knowledge files if behavior changed.
7. If the change is risky, create a branch from a stable checkpoint.
8. Commit with a descriptive, lowercase message.
9. Push to main.

## Branching Rules

- Production changes go to `main`.
- Risky changes go on a feature branch created from a stable checkpoint tag.
- Never commit directly to main if the change is large or experimental.
- Feature branch names use the pattern `feature/description` or `fix/description`.

## Risk Assessment

- **Low risk**: Documentation, comments, minor UI tweaks, knowledge files.
- **Medium risk**: Business logic changes, API endpoint modifications.
- **High risk**: Authentication changes, data model changes, deployment config.

High-risk changes require a branch from a stable checkpoint.

---

**Last Updated:** 2026-07-20 (c12bd44)
