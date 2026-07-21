# Route Manager Knowledge System

## Purpose

This directory is the persistent, Markdown-based project memory for the Route Manager application. It captures architectural intent, business rules, feature behavior, development workflows, and current state so that any AI coding session can recover context quickly and work accurately.

## Authoritative Documents

| Layer | Directory | Authority |
|-------|-----------|-----------|
| Knowledge | `architecture/` | Canonical system design and component boundaries |
| Knowledge | `features/` | End-to-end feature behavior and user flows |
| Knowledge | `api/` | HTTP API contracts, routes, and error handling |
| Knowledge | `database/` | Schema, storage, and data ownership |
| Memory | `memory/` | Current state, bugs, priorities, lessons learned |
| Execution | `workflows/` | How development, testing, deployment, and rollback work |
| Learning | `rules/` | Coding standards, security policies, naming conventions |
| Learning | `agents/` | AI session protocol and documentation rules |
| Business | `business/` | Product requirements, business rules, terminology |
| Roadmap | `roadmap/` | Planned features, backlog, technical debt |
| Completed | `completed/` | Release history and completed feature records |
| Decisions | `decisions/` | Architecture Decision Records |

**Source of truth rules:**
- Markdown knowledge files define the intended product behavior and architecture.
- Source code is the authoritative record of what is currently implemented.
- If code and documentation disagree, identify the conflict, determine which is wrong, and correct both.
- Never leave implementation and knowledge intentionally inconsistent.

## Document Map

Use this map to select relevant documents before editing code. Read only what you need.

### Core System Understanding
- `architecture/overview.md` — Full system architecture, stack, data flow
- `architecture/frontend.md` — React app structure, state, rendering
- `architecture/backend.md` — Express server, API routes, middleware
- `architecture/authentication.md` — Supabase auth, session, protected routes
- `architecture/deployment.md` — Railway, nixpacks, build pipeline
- `architecture/observability.md` — Debug Center, logging, health checks

### Features (read relevant one)
- `features/shower-gate.md` — Daily barcode-based shower proof gate
- `features/job-system.md` — Job types, statuses, completion workflow
- `features/route-system.md` — Route optimization, ride mode, battery routing
- `features/habit-tracker.md` — Daily habit logging and streaks
- `features/proof-vault.md` — Job proof attachments (photos, receipts)
- `features/ai-dispatcher.md` — AI chat dispatcher and safety news
- `features/screenshot-import.md` — OCR import from screenshots
- `features/voice-system.md` — Text-to-speech for directions

### API and Data
- `api/endpoints.md` — All REST API routes and contracts
- `api/authentication.md` — Auth headers, token refresh, error handling
- `api/error-contracts.md` — Error response shapes and handling
- `database/schema.md` — Database tables, indexes, migrations
- `database/ownership-and-security.md` — Row-level security, data isolation

### UI
- `ui/design-system.md` — Tailwind CSS architecture, component classes
- `ui/components.md` — Key React components and their responsibilities
- `ui/navigation.md` — Tab navigation, protected tabs, ride mode
- `ui/responsive-behavior.md` — Mobile-first layout, bottom nav, camera

### Workflows
- `workflows/development.md` — How to make changes safely
- `workflows/testing.md` — Testing approach and commands
- `workflows/deployment.md` — Build, deploy, verify pipeline
- `worksflows/rollback.md` — How to recover from bad deployments
- `worksflows/user-flows.md` — End-to-end user workflows

### AI Protocol
- `agents/ai-behavior.md` — Mandatory AI session protocol
- `agents/task-protocol.md` — Step-by-step task execution
- `agents/documentation-rules.md` — How to update knowledge files

### Rules
- `rules/coding-standards.md` — TypeScript, React, and CSS conventions
- `rules/security.md` — Secrets, auth, data protection
- `rules/git-and-checkpoints.md` — Commit, push, checkpoint workflow

### Current State
- `memory/current-state.md` — What is built, what phase
- `memory/known-bugs.md` — Active bugs and workarounds
- `memory/current-priorities.md` — What to work on next
- `memory/lessons-learned.md` — Past failures and improvements

### Business
- `business/requirements.md` — Product requirements
- `business/business-rules.md` — Enforced rules and logic
- `business/terminology.md` — Domain vocabulary

### Completed Work
- `completed/release-history.md` — All releases with SHAs
- `completed/completed-features.md` — Finished features

### Decisions
- `decisions/README.md` — ADR index
- `decisions/adr-template.md` — Template for new ADRs

## How to Use This System

Before every coding session:
1. Read `knowledge/README.md` (this file).
2. Identify the feature, system, or workflow you need to change.
3. Load the relevant knowledge documents from the map above.
4. Inspect the related source files listed in those documents.
5. Compare documented intent with current implementation.
6. Report any conflict or outdated documentation before editing code.
7. Make the smallest correct change.
8. Run lint, build, and tests.
9. Update all affected knowledge documents to reflect the change.
10. Record new architectural decisions when applicable.
11. Update memory files (bugs, priorities, lessons).
12. Commit and push using the project Git workflow.

## How Updates Are Recorded

- **Implementation changes** → update `last-updated` section in the relevant feature document.
- **Bug discovered** → add to `memory/known-bugs.md`.
- **Priority change** → update `memory/current-priorities.md`.
- **Architecture change** → create ADR in `decisions/`.
- **Release** → update `completed/release-history.md`.
- **Lesson learned** → add to `memory/lessons-learned.md`.

## How Conflicts Between Code and Documentation Are Resolved

1. Identify the specific conflict.
2. Determine the root cause:
   - Code is wrong (bug or incomplete implementation).
   - Documentation is stale (behavior changed but docs were not updated).
   - Product decision changed (intent shifted).
3. Correct the wrong side.
4. Record the resolution in the relevant knowledge document.
5. If a decision was involved, create or update an ADR.

## Related

- `AGENTS.md` — Project-level agent workflow instructions
- `docs/` — Pre-existing documentation (may be superseded by `knowledge/`)
