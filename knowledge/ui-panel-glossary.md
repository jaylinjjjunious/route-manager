# AIØ UI Panel Glossary

This file is the canonical source of truth for official screen, panel, feature, workflow, and system names used throughout the AIØ app.

Use these exact names in future prompts, issues, reviews, documentation, and code discussions. Do not rename an entry without explicitly updating this file.

Each entry must include a **code locator** so a CLI agent can jump directly to the implementation without searching unrelated files.

## Today Screen

### Road Readiness Panel

- **Location in UI:** Top of the Today screen, directly below the AIØ header.
- **Purpose:** Answers whether the user is ready to leave, what is blocking departure, whether battery and weather conditions are acceptable, whether the Preview Guide is ready, and what the next action should be.
- **Current review status:** The current Road Readiness visual, live-weather, Preview Guide gating, five-section review flow, completion feedback, reduced-motion behavior, and responsive layout are implemented and approved in production. The panel is considered functionally complete for the current phase, but not permanently closed because the planned route-aware battery readiness feature remains intentionally deferred for a later phase.
- **Locked visual direction:** Compact dark black-and-purple card (removed the bright-blue full-card treatment). Live weather sits in the top-left: a polished sun glyph by day, moon glyph at night, plus temperature, condition, and feels-like temperature. Readiness status pill stays in the top-right above a compact white pill primary action. Readiness message, wind chip, and informational battery chip follow below; the Preview Guide and battery checklist rows remain informational. Weather is display-only and never gates Road Readiness/Ride Mode (the manual wind setting is the only weather gate). When live weather is loading or unavailable (offline/denied permission), the glyph fades and the slot shows `…`/`Live weather unavailable` without fabricating values.
- **Primary code file:** `src/components/aio/TodayScreen.tsx`
- **Primary component:** `TodayScreen`
- **Code section marker:** `/* 1. Readiness + weather header */`
- **Current root element:** `<section aria-label="Readiness and weather">`
- **Current styling hook:** inline dark `#0C0A16` panel with purple glow (`.aio-hero-gradient` no longer used by this panel)
- **Live weather:** `src/services/weather/currentWeather.ts` (Open-Meteo lookup, mapping, F conversion) + `src/services/weather/useLiveWeather.ts` (location/offline/denied-permission fallbacks; geolocation only read when permission is already granted, otherwise Bakersfield hub `startCoord`)
- **Locked state rules:** Preview Guide review is mandatory for every actionable job. Unreviewed is `NEEDS ATTENTION` with `Review Preview Guide`; unavailable is `BLOCKED`. Reviewed enables `Start Ride Mode`, subject to weather. `none`/`calm`/`tailwind` add no warning, light headwind is `NEEDS ATTENTION` with one confirmation, and strong headwind is `BLOCKED`. Priority is `BLOCKED` → `NEEDS ATTENTION` → `READY`. Battery is visible but informational; Shower Gate is excluded from this calculation.
- **Planned battery feature placeholder:** Reserve visual space in the Road Readiness Panel for a future route-aware battery readiness feature, but do not implement or expand that logic now. The later feature should evaluate available battery or range against travel time, navigation usage, expected job duration, next-stop or charging needs, and a safety buffer. Intended future states are: enough range = complete/clear, low margin = `NEEDS ATTENTION`, insufficient range = `BLOCKED`. Until that work is explicitly approved, battery remains informational only and must not control Road Readiness status or Ride Mode eligibility.
- **Preview Guide completion feedback:** Only an in-session incomplete-to-reviewed transition animates. The row confirms completion with a green filled circle, white checkmark, visible `Preview Guide reviewed` text, and an `aria-live` announcement, then fades, collapses, and is removed. An already-reviewed ordinary render starts with the row removed and does not replay feedback. With `prefers-reduced-motion: reduce`, the completed state is announced and the row is removed immediately without decorative timing.
- **Inputs used by this panel:** `actionableJob`, `weatherWind`, `batteryPct`, `batteryMilesLeft`, `batteryRisk`, `previewGuideReadiness`, `onOpenPreviewGuide`, `onStartRideMode`, `startCoord` (live-weather location fallback)
- **State logic:** `src/components/aio/roadReadiness.ts`
- **Focused tests:** `tests/roadReadiness.test.ts`, `tests/previewGuideCompletionRow.test.ts`
- **Related shared primitives:** `ChecklistRow` from `src/components/aio/primitives`
- **CLI instruction:** Start in `src/components/aio/TodayScreen.tsx`, locate the comment `/* 1. Readiness + weather header */`, and edit only that section plus directly related shared styles or primitives required for this panel. Do not modify the Next Best Job, Travel Plan, Other Jobs, This Week, or bottom navigation sections unless the task explicitly names them.
- **Deferred-work rule:** Do not reopen this panel during Phase Two or second-panel work unless a production defect is found. The only planned future feature expansion is the separately scoped battery-readiness pass.

### Next Best Job / Current Job Panel

- **Location in UI:** On the Today screen, directly below the Road Readiness Panel. It is the first job card rendered under the section marker `/* 2. Next Best Job / Current Job */`.
- **Purpose:** Surfaces the single job the user should act on next — the in-progress `Current Job` when one is active, otherwise the `Next Best Job` — including the job's pay, the Distance / Ride / Due metric tiles, the primary action (`Navigate` when unlocked, otherwise `Locked`, plus `Under Review`/`Complete Job`), the `Job details` link, and the route-progress strip when the route is incomplete. A `Route clear` empty state offers `Add a job`.
- **Current review status:** Card structure, pay tile, actions, and logic unchanged. This pass refines only the contrast of the three square information tiles (Distance, Ride, Due) so they no longer blend into the card surface. Approved direction is neutral high-contrast metric tiles, not color-coded tiles.
- **Locked visual direction:** Keep the entire panel layout, size, spacing, buttons, content, and behavior unchanged. All three square metric tiles (Distance, Ride, Due) use one consistent neutral dark surface, slightly lighter than the main card, with a clearer border and a subtle inner top highlight for depth. Labels are brightened from dim gray to a muted white; values stay bold white. No separate slate, purple, or amber backgrounds — the three tiles stay in the same neutral family and no longer compete with each other. The Due tile may carry only a subtle warm amber accent in its label, remaining on the same neutral surface. No bright warning red is used unless existing logic already signals late/overdue. No clipping or overlap at 320px, 390px, or 430px.
- **Primary code file:** `src/components/aio/TodayScreen.tsx`
- **Primary component:** `TodayScreen`
- **Code section marker:** `/* 2. Next Best Job / Current Job */`
- **Current root element:** `<section aria-label="Next job">`
- **Primary card:** `AioCard className="mt-2.5 p-5" gradient={hasCurrentJob}`
- **Metric tiles:** a `grid grid-cols-3 gap-2.5` of three `MetricItem` elements (labels `Distance`, `Ride`, `Due`) inside the job card
- **Relevant inputs/state:** `primaryJob` (`currentJob || nextJob`), `hasCurrentJob`, `nextJob`, `currentJob`, `remainingJobs`, `nextStopDistance`, `nextStopRideMinutes`, `dueLabel(primaryJob)` (uses `job.dueTime`, else `Flex`), `nextStopNavLink`, `jobAccessLocked`, `completingJobIds`, `routeProgressPct`, `earningsAmount`/`earningsTitle`/`earningsFooter`, `completedJobsCount`, `routeTotalJobs`, `onToggleJobProgress`, `onOpenJob`, `onBlockJobAccess`, `onAddJob`
- **Related shared primitives:** `AioCard`, `AioSectionLabel`, `GradientIconTile`, `StatusIndicator`, `MetricItem`, `AioButton` from `src/components/aio/primitives` (the `MetricItem` label-color override `labelClassName` was added for this panel)
- **Focused tests:** no dedicated test file; covered indirectly by the general suite. Road Readiness state tests: `tests/roadReadiness.test.ts`, `tests/previewGuideCompletionRow.test.ts`
- **CLI instruction:** Start in `src/components/aio/TodayScreen.tsx`, locate the comment `/* 2. Next Best Job / Current Job */`, and edit only that section plus the directly related `MetricItem` shared primitive. Do not modify the Road Readiness Panel, job recommendation logic, the job title or address layout, the Pay tile, the `Navigate` button, the `Under Review`/`Complete Job` button, the `Job details` action, Travel Plan, Other Jobs, This Week, the bottom navigation, the floating assistant controls, or unrelated shared styles.

## Naming Rules

- Every major screen, panel, workflow, feature, and system receives one official name.
- New names are added here during review before implementation work proceeds.
- Every entry must include the primary file, component, code marker, relevant inputs, and related shared files.
- Future AI prompts must refer to the official names in this file.
- A name describes one specific interface or system only; avoid overlapping names.
- CLI agents must stay inside the named panel's code boundary unless the task explicitly authorizes related changes.
