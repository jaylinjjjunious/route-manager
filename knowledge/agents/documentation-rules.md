# Documentation Rules

## Core Principles

- **Write behavior, not code** — Document what the system does, not how individual lines work.
- **Keep files focused** — One feature or concept per file.
- **Stay accurate** — Do not add documentation that cannot be confirmed from the codebase.
- **Use consistent format** — Follow the template from `knowledge/README.md`.

## File Structure

Every knowledge file should have:
- A clear title heading
- Focused content sections
- Internal links to related knowledge files
- A `Last Updated` section with date and commit SHA

## Accuracy Rules

- Do not document features that do not exist in the codebase.
- Mark unconfirmed items clearly with `[UNCONFIRMED]`.
- Do not mix current behavior with deprecated behavior.
- Archive superseded material by moving it to `decisions/` or `completed/`.

## Maintenance

- `knowledge/README.md` indexes all knowledge files — keep it current.
- When behavior changes, update the relevant knowledge file in the same session.
- When adding a new knowledge file, add an entry to `knowledge/README.md`.
- Remove or archive entries for features that no longer exist.

## What to Document

- User-visible behavior and workflows
- Business rules and constraints
- Architecture decisions and rationale
- Known bugs and workarounds
- Deployment and operational procedures

## What NOT to Document

- Line-by-line code explanations (the source is the documentation)
- Temporary workarounds that have been resolved
- Ideas that have not been confirmed as planned features
- Third-party library internals

---

**Last Updated:** 2026-07-20 (c12bd44)
