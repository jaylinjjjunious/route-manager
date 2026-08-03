# AIØ UI Panel Glossary

This file is the canonical source of truth for official screen, panel, feature, workflow, and system names used throughout the AIØ app.

Use these exact names in future prompts, issues, reviews, documentation, and code discussions. Do not rename an entry without explicitly updating this file.

Each entry must include a **code locator** so a CLI agent can jump directly to the implementation without searching unrelated files.

## Today Screen

### Road Readiness Panel

- **Location in UI:** Top of the Today screen, directly below the AIØ header.
- **Purpose:** Answers whether the user is ready to leave, what is blocking departure, whether battery and weather conditions are acceptable, whether the Preview Guide is ready, and what the next action should be.
- **Current review status:** State/action rules implemented; final visual refinement remains separately reviewable.
- **Locked visual direction:** Use the dark black-and-purple style from the approved mockup. Keep the panel and its position, reduce its height, remove the bright-blue full-card treatment, preserve the approved visual hierarchy, remove contradictory readiness states, improve text contrast, and make secondary actions visually secondary.
- **Primary code file:** `src/components/aio/TodayScreen.tsx`
- **Primary component:** `TodayScreen`
- **Code section marker:** `/* 1. Readiness + weather header */`
- **Current root element:** `<section aria-label="Readiness and weather">`
- **Current styling hook:** `.aio-hero-gradient`
- **Locked state rules:** Preview Guide review is mandatory for every actionable job. Unreviewed is `NEEDS ATTENTION` with `Review Preview Guide`; unavailable is `BLOCKED`. Reviewed enables `Start Ride Mode`, subject to weather. `none`/`calm`/`tailwind` add no warning, light headwind is `NEEDS ATTENTION` with one confirmation, and strong headwind is `BLOCKED`. Priority is `BLOCKED` → `NEEDS ATTENTION` → `READY`. Battery is visible but informational; Shower Gate is excluded from this calculation.
- **Inputs used by this panel:** `actionableJob`, `weatherWind`, `batteryPct`, `batteryMilesLeft`, `batteryRisk`, `previewGuideReadiness`, `onOpenPreviewGuide`, `onStartRideMode`
- **State logic:** `src/components/aio/roadReadiness.ts`
- **Focused tests:** `tests/roadReadiness.test.ts`
- **Related shared primitives:** `ChecklistRow` from `src/components/aio/primitives`
- **CLI instruction:** Start in `src/components/aio/TodayScreen.tsx`, locate the comment `/* 1. Readiness + weather header */`, and edit only that section plus directly related shared styles or primitives required for this panel. Do not modify the Next Best Job, Travel Plan, Other Jobs, This Week, or bottom navigation sections unless the task explicitly names them.

## Naming Rules

- Every major screen, panel, workflow, feature, and system receives one official name.
- New names are added here during review before implementation work proceeds.
- Every entry must include the primary file, component, code marker, relevant inputs, and related shared files.
- Future AI prompts must refer to the official names in this file.
- A name describes one specific interface or system only; avoid overlapping names.
- CLI agents must stay inside the named panel's code boundary unless the task explicitly authorizes related changes.
