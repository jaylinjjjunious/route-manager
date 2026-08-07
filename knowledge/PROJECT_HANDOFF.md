# AIØ Route Manager — Project Handoff

This document is the living handoff for the AIØ Route Manager project.

A new chat, CLI agent, or developer should read this file before making decisions or editing code. It captures the project vision, locked rules, current direction, important repository locations, implementation history, active review work, and open questions.

## New Chat Startup Instruction

Paste this into a new chat:

> Read `knowledge/PROJECT_HANDOFF.md` and `knowledge/ui-panel-glossary.md` from the `jaylinjjjunious/route-manager` repository before answering or suggesting changes. Treat those files as the current source of truth. Do not redesign, rename, or modify unrelated features without explicit approval.

## Repository

- **Repository:** `jaylinjjjunious/route-manager`
- **Primary branch:** `main`
- **Working directory used in Termius/OpenCode:** `C:\Users\termiususer\route-optimizer-app`
- **Original local directory:** `C:\Users\teren\OneDrive\Documents\Route Manager\route-optimizer-app`
- **Reason for cloned working directory:** OpenCode encountered Windows/OneDrive permission errors under the original user profile, so the repository was cloned into `termiususer`'s home directory.
- **Primary app entry:** `src/App.tsx`
- **Primary Today screen:** `src/components/aio/TodayScreen.tsx`
- **Canonical panel glossary:** `knowledge/ui-panel-glossary.md`

## Product Identity

- **Brand:** `AIØ`
- AIØ means the app should feel like one intelligent operational assistant rather than a loose collection of unrelated tools.
- The app is mobile-first and primarily used while planning, traveling to, and completing field jobs.
- The Today screen is the operational home screen.

## Core Product Goal

The app should help the user answer, quickly and reliably:

1. Am I ready to leave?
2. What job should I do next?
3. Can I arrive and finish on time?
4. What route or travel mode should I use?
5. What is blocking me?
6. What work remains today and this week?

The long-term recommendation system must consider real operational constraints, not just distance.

## Locked Product Principles

### Preserve the approved visual direction

- Do not redesign the whole screen unless explicitly requested.
- The approved direction is the original dark, sleek, black-and-purple mobile mockup.
- Current work is a refinement pass: identify what works, what does not, what should be added, and what should be removed.
- Do not change surrounding screens, panels, or systems while editing one named panel unless explicitly authorized.
- Both dark and light mode remain required.
- Dark mode should stay closest to the approved reference.
- Light mode should be intentional, not a simple color inversion.

### Use canonical names

- Every major screen, panel, feature, workflow, and system needs one official name.
- Use the exact names in `knowledge/ui-panel-glossary.md`.
- Each glossary entry should eventually identify:
  - screen location
  - purpose
  - primary code file
  - component or function
  - code section marker
  - relevant inputs/state
  - related styles/primitives
  - explicit edit boundary
- The purpose is to stop future AI agents from misunderstanding a request and modifying unrelated code.

### One panel at a time

For each panel review:

1. Give it an official name.
2. Define its purpose.
3. Identify the exact code location.
4. Decide what to keep.
5. Decide what to refine, add, or remove.
6. Lock the decisions only after discussion.
7. Implement only that named panel.

Do not write every brainstorm into the glossary. The glossary should contain locked names and useful code-navigation facts, not every temporary idea.

### Preserve existing features

- Existing legacy tools and features should remain reachable through `More` unless removal is explicitly approved.
- Do not rewrite working subsystems merely to restyle the Today screen.
- Do not replace the Transit engine, Preview Guide, Get Ready, job storage, or unrelated workflows during UI refinement.

### Recommendation safety

For the future recommendation engine:

- Deadline and arrival safety outrank distance and pay.
- A closer or higher-paying job must not be selected when it risks making a time-sensitive job late or impossible.
- Actual travel time should outrank straight-line distance when route data is available.
- Missing data must not be treated as favorable data.
- The same inputs should produce the same result.
- Recommendation logic should be separated from UI rendering and implemented in testable functions.

### Current Job behavior

- Once a job is started, it remains the primary card as `Current Job`.
- It stays there until completed or paused.
- The app may calculate what comes next in the background, but it must not replace the Current Job card.

### Paused Job behavior — planned direction

- Pausing should require a quick reason and allow an optional note.
- Some pause reasons may require a retry time.
- When the blocker clears, the status becomes `Ready to be considered`.
- The job returns to the recommendation pool.
- It does not automatically jump to the top.
- A subtle notice may tell the user it is eligible again.

## Phase One Direction

Phase One established the AIØ shell and Today-screen structure.

The locked Today-screen order is:

1. AIØ header
2. Road Readiness panel
3. Next Best Job or Current Job
4. Today's Other Jobs
5. Travel Plan
6. This Week
7. Bottom navigation

### Bottom navigation

- `Today`
- `Jobs`
- `More`

All existing features should remain reachable through `More` unless explicitly removed.

### Current visual-review findings

The Phase One implementation improved structure, but the first review identified several issues:

- The original bright-blue readiness card is too tall and visually dominant.
- It does not match the approved black-and-purple reference closely enough.
- The panel can show contradictory information, such as `Ready` while saying no Preview Guide exists.
- Some secondary text has insufficient contrast.
- The Next Best Job card is too large and truncates content aggressively.
- The green Navigate action competes with the purple AIØ brand direction.
- The floating assistant button overlaps content and competes with bottom navigation.
- The bottom navigation is too tall and can obstruct content.
- Travel Plan is useful but oversized.
- Revision alerts feel visually heavy.
- The weekly strip is difficult to read and does not yet match the approved clean day-indicator concept.

These are review notes, not permission to change all of those areas at once.

## Implemented: Road Readiness Panel

### Official name

**Road Readiness Panel**

### UI location

Top of the Today screen, directly below the AIØ header.

### Primary code location

- **File:** `src/components/aio/TodayScreen.tsx`
- **Component:** `TodayScreen`
- **Code marker:** `/* 1. Readiness + weather header */`
- **Root element:** `<section aria-label="Readiness and weather">`
- **Current style hook:** `.aio-hero-gradient`

### Purpose

The panel should answer, at a glance:

- Am I ready to leave?
- Is anything blocking me?
- Is battery sufficient?
- Is the Preview Guide ready?
- What is the immediate action?

### Locked decisions so far

- The visible label should be `Road Readiness` rather than `Ready for the Road`.
- Keep the panel at the top of Today.
- Keep the checklist.
- Keep exactly two checklist rows for now:
  1. Preview Guide readiness
  2. Battery readiness
- Keep `Start Ride Mode` inside the panel.
- Make `Start Ride Mode` compact, visually obvious at a glance, quick to tap, and easy to use while riding.
- The action must not distort the panel layout or turn the whole panel into an oversized button.
- Replace the giant bright-blue treatment with the approved dark black-and-purple style.
- Reduce the panel height.
- Improve text contrast.
- Remove contradictory readiness messaging.
- Keep secondary actions visually secondary.
- Preview Guide review is mandatory for every actionable job before Ride Mode can start. Opening the guide does not count as review; its five required sections must each be viewed for that job before review is complete.
- An unreviewed Preview Guide produces `NEEDS ATTENTION`, makes `Review Preview Guide` the primary action, and opens that job's Preview Guide directly.
- An unavailable Preview Guide produces `BLOCKED` and disables Ride Mode.
- A reviewed Preview Guide makes `Start Ride Mode` the primary action.
- Wind mapping is exact: `none`, `calm`, and `tailwind` add no warning; `headwind_light` produces `NEEDS ATTENTION` and requires one confirmation before Ride Mode; `headwind_strong` produces `BLOCKED` and disables Ride Mode.
- Status priority is `BLOCKED`, then `NEEDS ATTENTION`, then `READY`.
- Battery stays visible but does not affect Road Readiness status or Ride Mode eligibility in this pass.
- Shower Gate state is not part of the Road Readiness calculation.

### Current implementation inputs

The existing panel uses:

- `hasCurrentJob`
- `nextJob`
- `weatherWind`
- `batteryPct`
- `batteryMilesLeft`
- `batteryRisk`
- `actionableJob`
- `previewGuideReadiness`
- `onStartRideMode`
- `onOpenPreviewGuide`

### Current implementation structure

The Today screen renders:

- a live weather header: sun/moon glyph beside the large temperature, a slim vertical divider closer to the temperature, and a right two-line stack with feels-like temperature on top and condition text below
- a derived `READY`, `NEEDS ATTENTION`, `BLOCKED`, or no-actionable-work status and explanation
- wind pill
- battery/range pill
- Review Preview Guide or Start Ride Mode as the state-driven primary action
- an inline one-confirmation step for light headwind
- Preview Guide checklist row
- battery checklist row

The panel is currently located at the top of `TodayScreen.tsx`, before the Next Best Job / Current Job section.

The state derivation is isolated in `src/components/aio/roadReadiness.ts` and covered by `tests/roadReadiness.test.ts`.

Final panel polish adds a one-time, session-only completion confirmation when Preview Guide review changes from incomplete to complete: the row fills green, displays a white check and `Preview Guide reviewed`, announces through `aria-live`, then fades, collapses, and is removed. Already-reviewed ordinary renders do not replay it. Reduced-motion users receive the announcement and immediate row removal without decorative timing. Responsively, the weather row is always horizontal and never wraps one character at a time (`Feels like XX°` is `whitespace-nowrap`, the condition word-wraps only); below the `min-[410px]` breakpoint (covering 320/390/430px) the weather header keeps the full width and the readiness actions stack below it as a compact right-aligned group, while at `min-[410px]` and up they sit side-by-side (weather left at natural width, actions top-right). The status pill is compact (`px-2 py-0.5 text-[11px]`) and the primary action is a compact white pill (`min-h-11 px-2 text-[12px]`) with a 44px touch target. Active panel controls use at least 44px height, and the battery placeholder remains informational. Signed-in real-device iPhone verification remains required.

## Implemented: Next Best Job / Current Job Panel (refinement pass)

### Official name

**Next Best Job / Current Job Panel**

### UI location

On the Today screen, directly below the Road Readiness Panel — the first job card under `/* 2. Next Best Job / Current Job */` in `src/components/aio/TodayScreen.tsx`.

### Locked decision for this pass

Keep the entire panel layout, size, spacing, buttons, content, and behavior unchanged. Only the contrast of the three existing square information tiles is refined so they no longer blend into the card. Approved direction: **neutral high-contrast metric tiles, not color-coded tiles**.

- **Distance, Ride, Due** all share one consistent neutral dark surface, slightly lighter than the main card, with a clearer border and a subtle inner top highlight for depth.
- Labels are brightened from dim gray to a muted white; values stay bold white.
- No separate slate, purple, or amber backgrounds — the three tiles stay in the same neutral family and do not compete with each other.
- The Due tile may carry only a subtle warm amber accent in its label, remaining on the same neutral surface.
- No bright warning red is introduced. Dark and light mode are both preserved. Verified against 320px, 390px, and 430px for clipping/overlap. Full panel details and the exact edit boundary are in `knowledge/ui-panel-glossary.md`.

Road Readiness remains closed after its final polish except for the deferred route-aware battery feature, which stays informational until explicitly approved.

## Implemented: Today's Other Jobs Panel (store-logo pass)

### Official name

**Today's Other Jobs Panel**

### Approved logo behavior

- The **Next Best Job / Current Job Panel** also uses the shared store-logo system: its job identity square (the large tile left of the store name) renders the matched logo with `object-contain` at the same `h-14 w-14 rounded-[18px]` size and the same resolver/failure fallback. Only the weather icon in Travel Plan and other squares that do not identify a job keep their generic appearance.
- Each row's generic job icon square is replaced by a matching store logo when the store is registered; otherwise the generic icon is preserved.
- A reusable store-logo registry (`src/services/storeLogos.ts`) holds stable `companyId`, `displayName`, `logoPath`, and normalized aliases for `foods-co`, `sprouts`, `bevmo`, `walgreens`, `dollar-general`, `family-dollar`, `vons`, `target`, and `albertsons`.
- Matching priority: (1) a stable `companyId`/`storeId` field when the job already has one; (2) the best available company/store/title text. Normalization strips case, punctuation, apostrophes, repeated spaces, store numbers, and filler words such as `revisit`, `revision`, `store`, and `pharmacy`, so titles like `Vons Revisit`, `Vons #203`, `Target Store 1384`, `Dollar General - White Ln`, `Family Dollar 2151 S Chester Ave`, `Albertsons Rosedale`, and `Walgreens Pharmacy #1234` all resolve to the right store.
- Existing saved jobs resolve automatically at render time from their `storeName`/`notes`; no stored job is re-added, migrated, or mutated. Future jobs matching these stores get the logo automatically. No backend dependency in this pass, but the registry is structured so logo URLs can later come from backend data.
- UI rules: the logo square keeps the existing `h-11 w-11 rounded-[14px]` dimensions, renders with `object-contain`, restrained `p-1.5` padding, and a neutral background that works for white-background and transparent logos in dark and light mode. Meaningful alt text uses the display name. A failed image load falls back to the current generic icon. Logos are never stretched, recolored, redrawn, or cropped.
- Assets live in `public/store-logos/*.svg`; the logo renderer is `src/components/aio/StoreLogo.tsx`, and `CompactJobRow` gained an optional `iconSlot` prop (default rendering unchanged for other screens). `StoreLogo` gained a `size` prop (`md`/`lg`) so the Next Best Job / Current Job identity square shares the same renderer.

## Implemented: AIØ Top Header profile picture + More profile row

### Official name

**AIØ Top Header**

### UI location

The sticky top bar on the Today (`dashboard`), Jobs, and More tabs, above the main content.

### Purpose

Identifies the app (`AIØ`), greets the signed-in user, shows the current date, and gives one-tap access to the profile / More destination.

### Locked decisions

- The header's right-side controls are replaced by a single circular profile-picture button using the local bundled asset `/profile/avatar.webp` (`public/profile/avatar.webp`).
- The old three-dots (`More`) button and the old header light/dark theme button are removed from the header and must not be re-added.
- Tapping the header profile picture opens the same destination the three-dots button opened: the More page (`handleTabChange('more')` in `src/App.tsx`).
- The greeting and date text are unchanged. The primary AIØ wordmark is the text wordmark `AIØ` (`AI` + `<span aria-label="Ø (slashed zero)">Ø</span>`) rendered at `text-[34px] font-black leading-none tracking-[-0.02em]` with `text-[var(--color-aio-text)]`; the bundled badge images `/branding/aio-logo-black.svg` and the truncated `public/branding/aio-logo-black.png` are not used in the header.
- Two distinct brand marks exist and are never mixed: (1) **In-app header brand mark** = the `AIØ` text wordmark in `AioHeader.tsx`; (2) **Home Screen/PWA app icon** = the black-background, white-`AIØ` badge artwork. Locators: `public/manifest.webmanifest` → `/icons/aio-icon-192.png` (192x192) and `/icons/aio-icon-512.png` (512x512); `index.html` → `/apple-touch-icon.png` (180x180), `/favicon-32x32.png`, `/favicon-16x16.png`. The header never renders the badge image.
- The header keeps its height, `items-end` bottom alignment, and `gap-3` spacing between the logo and the profile button, plus the right-side `h-11 w-11` profile tap target (profile image is `overflow-hidden rounded-full` with `object-cover` for a clean circular crop).
- The More page Account row placeholder (initial-letter gradient circle) is replaced by the exact same `/profile/avatar.webp` at `h-12 w-12 rounded-full` with `object-cover`; name, text, layout, and navigation are unchanged.
- Dark/light mode support is NOT removed: the theme toggle remains in the More page Account row and in Settings, and the global theme state/logic in `src/App.tsx` is untouched. The text wordmark uses the theme text color (`--color-aio-text`), so it reads in both modes (no theme-dependent badge image).
- Profile name and account data are unchanged. No store-logo paths or other graphics changed.

### Code locators

- Header component: `src/components/aio/AioHeader.tsx` (`AioHeader`, root `<header className="sticky top-0 z-40 ...">`), used once in `src/App.tsx` under the `{/* Header */}` marker with `onOpenProfile={() => handleTabChange('more')}`.
- Primary AIØ logo: the `<h1 className="mt-0.5 text-[34px] font-black leading-none tracking-[-0.02em] text-[var(--color-aio-text)]">` inside the left `min-w-0` block in `AioHeader.tsx`, rendering the text wordmark `AI` + `<span aria-label="Ø (slashed zero)">Ø</span>`. No logo image is used in this header.
- More profile row: `src/components/aio/MoreScreen.tsx`, `<section aria-label="Account">`, first child of the account card row.
- Shared avatar asset: `public/profile/avatar.webp`, referenced as `/profile/avatar.webp` by `const AVATAR_PATH` in both files.
- App-icon badge assets: `public/icons/aio-icon-192.png` and `public/icons/aio-icon-512.png` (black/white AIØ badge) are used only for the PWA manifest and favicons; they are not rendered in the header. `public/branding/aio-logo-black.svg` / `aio-logo-black.png` are unused in the app.

### Tests

`tests/aioHeaderProfile.test.ts` covers: header shows the profile picture and only that one image (no logo image), the header keeps the `AIØ` text wordmark plus greeting/date, the old three-dots and theme buttons are removed, the profile picture opens the More/profile destination, the More profile row uses the same avatar image, dark/light mode remains available on the More page, and the avatar asset is local and bundled.

## Phase Two Planned Direction

Phase Two is intended to build the Next Best Job recommendation engine after Phase One is complete and verified.

The recommendation engine should eventually account for:

- current location
- actual travel time
- travel mode
- required arrival time
- deadline
- leave-by margin
- job duration
- Preview Guide completion
- Get Ready completion
- dress code, credentials, sell sheet, and supplies
- Transit availability and reliability
- weather exposure, heat, UV, and walking time
- battery sufficiency
- pay and pay-per-total-time
- urgency
- store hours
- route grouping
- blockers

Hard feasibility checks should run before weighted ranking.

The UI should provide a concise, human-readable explanation for why a job was chosen.

Do not use a language model to choose jobs. The ranking should be transparent, deterministic, and tested.

## Repository Architecture Notes

The app already includes or references modules for:

- jobs and job state
- scheduling
- route optimization
- Transit
- Preview Guide
- inventory custody
- shower/readiness gating
- battery
- proof assets
- assistant UI
- debug tools
- AIØ screens and primitives

Important AIØ files currently referenced by the app include:

- `src/components/aio/AioHeader`
- `src/components/aio/TodayScreen`
- `src/components/aio/JobsScreen`
- `src/components/aio/MoreScreen`
- `src/components/aio/primitives`

The project should move toward clean separation between:

- domain/state logic
- recommendation logic
- route/travel services
- UI components
- shared primitives

Avoid burying complex operational logic inside large page components.

## Tooling and Workflow

### OpenCode

- OpenCode is installed globally with `npm install -g opencode-ai@latest`.
- It is used for heavier multi-file implementation work.
- Run it from `C:\Users\termiususer\route-optimizer-app`.

### Codex

- Use Codex selectively for focused review, tests, and targeted changes.
- Preserve most of its remaining usage for recommendation-engine work.

### Implementation discipline

Before editing:

- inspect the exact named panel or subsystem
- identify reusable logic
- identify risks and missing data
- define the edit boundary

After editing:

- run relevant tests
- run lint
- run the production build
- inspect the diff
- verify dark and light mode
- test mobile widths such as 320, 390, and 430 pixels when UI is affected

Do not push, deploy, or make unrelated changes without explicit approval.

## Communication Preferences

- Be direct and action-oriented.
- Avoid long explanations when the user is actively working.
- Give one useful next step at a time during live implementation.
- Do not change things the user did not ask to change.
- Do not treat brainstorming as a locked decision.
- When proposing a visual change, stay close to the approved mockup and show only the specific panel or element being discussed.
- Do not generate an unrelated full-screen concept when the request is for one small panel.

## Decision Log

### 2026-08-03 — Canonical naming system

Decision:

- Create a canonical panel glossary.
- Give every major panel and feature one stable official name.
- Include exact repository/code locations so future CLI agents can jump directly to the correct implementation.

Files:

- `knowledge/ui-panel-glossary.md`

### 2026-08-03 — Road Readiness visual direction

Decision:

- Keep the Road Readiness Panel.
- Keep the two checklist rows.
- Keep Start Ride Mode inside it.
- Rename the visible heading to `Road Readiness`.
- Make it shorter and compact.
- Use the approved black-and-purple visual language rather than the large bright-blue treatment.

### 2026-08-03 — Road Readiness state and action rules

Decision:

- Preview Guide review is mandatory for every actionable job.
- Preview unavailable and strong headwind are blocking conditions.
- Preview unreviewed and light headwind require attention.
- Light headwind requires one confirmation before Ride Mode.
- Battery is informational only for this state calculation, and Shower Gate is excluded from it.
- Apply state priority in the order `BLOCKED`, `NEEDS ATTENTION`, `READY`.

### 2026-08-03 — Handoff system

Decision:

- Maintain this `PROJECT_HANDOFF.md` file as the full project-context handoff.
- Maintain `ui-panel-glossary.md` as the official naming and code-location reference.
- New chats should read both before making changes.

### 2026-08-04 — Next Best Job / Current Job metric tile contrast

Decision:

- Refine the contrast of the three square information tiles (Distance, Ride, Due) so they no longer blend into the card.
- Approved direction is **neutral high-contrast metric tiles, not color-coded tiles**: one consistent neutral dark surface slightly lighter than the main card, a clearer border, a subtle inner top highlight, brighter muted-white labels, and bold white values.
- No separate slate, purple, or amber tile backgrounds. The Due tile may use only a subtle warm amber accent in its label and stays in the same neutral surface family.
- Keep the panel layout, spacing, values, and logic unchanged; preserve dark and light mode.
- Road Readiness remains closed after its final polish, except for the deferred route-aware battery feature which stays informational until explicitly approved.

### 2026-08-04 — Today's Other Jobs store-logo behavior

Decision:

- Replace the generic job icon square with a matching store logo for the registered stores (`foods-co`, `sprouts`, `bevmo`, `walgreens`, `dollar-general`, `family-dollar`, `vons`, `target`, `albertsons`) using a reusable, deterministic registry and resolver.
- Keep the panel layout, row height, square size, spacing, text, prices, badges, chevrons, and behavior unchanged; preserve dark and light mode.
- Resolve from a stable companyId when present, otherwise from normalized company/store/title text; never migrate or mutate stored jobs; fall back to the generic icon when nothing matches or an image fails to load.
- No backend dependency in this pass; the registry stays structured for later backend-supplied logo URLs.

### 2026-08-04 — Shared store-logo system across all job identity squares

Decision:

- The store-logo system is now shared across every job identity square on the Today screen, including the Next Best Job / Current Job Panel and Today's Other Jobs Panel.
- The Next Best Job / Current Job identity square keeps its `h-14 w-14 rounded-[18px]` size, rounded corners, spacing, and layout; only the existing large generic `GradientIconTile` is replaced by `StoreLogo` with `size="lg"`, using the same resolver and image-failure fallback.
- The weather icon in Travel Plan and any square that does not identify a job keeps its generic appearance.
- `StoreLogo` gained a `size` prop (`md`/`lg`); the registry gained `family-dollar` (assets added on origin/main), bringing it to nine registered stores.

### 2026-08-04 — Shared store-logo system on the Jobs page

Decision:

- The shared store-logo system now applies to every job identity square on the **Jobs page** as well as the Today screen: the `JobsScreen` `CompactJobRow` lists (Today, later days, and Route B Standby) pass `iconSlot={<StoreLogo job={job} />}`.
- Existing saved jobs update automatically at render time via the same resolver (stable companyId first, then normalized store/company/title text); no stored job is migrated or mutated. Future matching jobs show the logo automatically.
- Visual rules preserved: row/card heights, spacing, rounded corners, text, badges, buttons, prices, and behavior unchanged; logos render `object-contain` on the existing `h-11 w-11 rounded-[14px]` neutral square; unknown stores and failed image loads fall back to the generic icon. Non-job icons are unchanged.
- The overdue/unscheduled attention card rows have no job identity square and are unchanged.

### 2026-08-04 — Today's Other Jobs / Travel Plan layout swap

Decision:

- Swap the vertical positions of the **Today's Other Jobs Panel** and the **Travel Plan Panel** on the Today screen so the locked order is: Road Readiness Panel, Next Best Job / Current Job Panel, Today's Other Jobs Panel, Travel Plan Panel, This Week.
- This is a layout-order-only change. Both panels move as complete sections (all content, state, callbacks, styling, spacing, store-logo rendering, revision banner, empty states, and route speech behavior preserved) with no duplication and no fragments left behind. Their aria-labels and canonical names are unchanged.
- Section-number comments in `src/components/aio/TodayScreen.tsx` were updated to match: Today's Other Jobs is now `/* 3. Today's Other Jobs */` and Travel Plan is now `/* 4. Travel Plan */`.
- Travel Plan Panel was added to `knowledge/ui-panel-glossary.md` so both panels have a recorded UI location and section marker.

### 2026-08-04 — Job Details Mini Page frosted glass + shared store logo

Decision:

- Apply the approved frosted-glass treatment to the **Job Details Mini Page** (`src/components/JobDetailModal.tsx`): overlay `bg-black/35` with `backdrop-blur-[6px]`; card `bg-[#111214]/[0.80]` with `backdrop-blur-[14px]` and `border-white/[0.12]` (webkit variants included for iOS).
- The job identity square beside the store name uses the existing shared store-logo system (`src/services/storeLogos.ts` + `src/components/aio/StoreLogo.tsx` + `public/store-logos/*.svg`) at the default `md` size (`h-11 w-11 rounded-[14px]`, `object-contain`). Unknown stores and failed image loads keep the existing generic `GradientIconTile` fallback.
- The status-toggle button keeps its existing icon behavior — Hourglass for the normal pending state, existing `CheckSquare` states for completed and under_review — and the store logo is never placed inside the status button.
- No duplicate resolver or `StoreLogo` implementation was created; no Clearbit logo URLs or network-dependent logo fetching were introduced; stored job data is never mutated.
- Registered stores are `foods-co`, `sprouts`, `bevmo`, `walgreens`, `dollar-general`, `family-dollar`, `vons`, `target`, `albertsons` (assets in `public/store-logos/*.svg`), unchanged.

### 2026-08-04 — Job Details Mini Page logo/status square correction

Decision:

- Correct the Job Details Mini Page title row so there is only one square: the shared store logo replaces the old hourglass/status-toggle square in its exact current position (`h-9 w-9 rounded-lg`).
- The store name and address remain immediately to the right of that square; the extra `md` (`h-11 w-11`) `StoreLogo` identity square that had been added beside the title is removed.
- The normal pending Hourglass icon is removed; the matched store logo renders in the square (`object-contain`, `p-1`) via the shared `resolveStoreLogo` resolver (`src/services/storeLogos.ts`). Unknown stores and failed image loads fall back to the original Hourglass icon.
- Completed (`text-blue-500`) and under_review (`text-indigo-500`) states keep the existing `CheckSquare` icons in the same square, preserving status meaning without creating a second identity square.
- Clicking the square preserves the old status-toggle action (`Mark under review` / `Complete after review` / `Reactivate`).
- The approved frosted-glass treatment is unchanged. The shared `StoreLogo` component (`md`/`lg`) remains the standard for the Today screen and Jobs page identity squares; the modal resolves logos directly so the artwork fits the smaller `h-9 w-9` square with the Hourglass fallback. Stored job data is never mutated.

### 2026-08-04 — AIØ Top Header profile picture + More profile avatar

Decision:

- The AIØ Top Header's right-side controls are replaced by a single circular profile-picture button using the local bundled asset `public/profile/avatar.webp` (`/profile/avatar.webp`); the three-dots and header theme buttons are removed and must not be re-added.
- The header profile button navigates to the More page (`handleTabChange('more')`), the same destination the three-dots button used.
- The More page Account row placeholder is replaced with the exact same avatar asset at `h-12 w-12 rounded-full` with `object-cover`; name, text, layout, and navigation unchanged.
- Dark/light mode support stays available via the More page theme toggle and Settings; global theme logic in `src/App.tsx` is unchanged.
- Header height, spacing, and the `h-11 w-11` tap target are preserved.

### 2026-08-04 — AIØ Top Header primary brand logo (text wordmark)

Decision:

- The primary AIØ brand mark in the AIØ Top Header is the text wordmark `AIØ` (`AI` + `<span aria-label="Ø (slashed zero)">Ø</span>`), rendered at `text-[34px] font-black leading-none tracking-[-0.02em]` with the theme text color `--color-aio-text`.
- Locked direction: no logo image is rendered in the header. The earlier bundled badge image direction (`/branding/aio-logo-black.svg`) is superseded; the badge artwork survives only as favicon / PWA icon outputs (`public/icons/aio-icon-192.png`, `public/icons/aio-icon-512.png`).
- Header height, `items-end` alignment, and `gap-3` spacing from the profile button are preserved.
- The profile-picture button, profile navigation, More page account row, Today/Jobs/Job Details screens, store-logo registry, bottom navigation, and global theme logic are unchanged.
- The invalid/truncated `public/branding/aio-logo-black.png` (IDAT declares 23,589 bytes but the file is only 7,506 bytes, no IEND chunk) is never wired into the app and must not be used.

### 2026-08-05 — Road Readiness responsive weather-row bug fix

Decision:

- The Road Readiness live-weather header row (`[weather icon] [temperature] [short vertical divider] [two-line text stack]`) is kept fully horizontal at every width. The production bug — `Feels like XX°` and the condition wrapping one character per line, a stretched divider, and an over-tall panel at 390/430px — was caused by `break-words` plus `min-w-0` letting the right text stack collapse to near-zero width when the `min-[390px]` side-by-side row starved it of space (weather row received only 130px at 390px and 170px at 430px against ~190px of natural content, while the 192px readiness action column was `shrink-0`).
- Fix in `src/components/aio/TodayScreen.tsx` (`/* 1. Readiness + weather header */`): `Feels like XX°` is now `whitespace-nowrap`, the condition dropped `break-words` (normal word wrapping only, so no character-by-character wrapping ever), and the divider gained `self-center` (stays short and vertically centered). The outer header changed from `min-[390px]:flex-row` to `sm:flex-row`, so below 640px (including the tested 320/390/430px widths) the weather row takes the full header width with the readiness actions stacking below it, and at `sm`/640px and up the weather row sits top-left beside the top-right status pill and primary action.
- No weather logic, readiness logic, Preview Guide logic, battery, wind, action button classes, or other Today-screen panels changed. Verified headlessly at 320/390/430/768px: feels-like single-line and nowrap, condition single-line (and the offline `Live weather unavailable` fallback never overflows), divider 1px x 32px centered, zero horizontal overflow, panel height restored (390/430px: 392px vs the buggy 462px). `tests/roadReadiness.test.ts` and `tests/previewGuideCompletionRow.test.ts` pass, `npm run lint` and `npm run build` pass.

### 2026-08-05 — Road Readiness compact header actions

Decision:

- Shrink and reposition the two Road Readiness header controls — the `NEEDS ATTENTION` status pill and the Review Preview Guide primary button — while keeping the weather row untouched. Weather logic, weather typography, divider placement, readiness logic, Preview Guide behavior, Start Ride Mode behavior, battery/wind rows, and other Today-screen panels are unchanged.
- Status pill is now `px-2 py-0.5 text-[11px]` with a 12px icon and `gap-1`, staying a one-line uppercase label. The primary action is a compact white pill `min-h-11 px-2 text-[12px]` with a 14px icon, icon + label on one line, `min-h-11` preserving the 44px touch target, and never full-width. Both right-align inside the action column.
- Responsive rule replaced `sm`/640px with `min-[410px]`: below 410px the weather row keeps the full header width and the two controls stack below it as a compact right-aligned group (`items-end`, no stretch); at 410px and up the weather row sits top-left at its natural width with the controls top-right (`ml-auto`). The header row is `flex-wrap` with the weather row `shrink-0`, so the disabled `Preview Guide Unavailable` state (≈192px wide) wraps below the weather as a right-aligned group at 410–430px instead of squeezing the nowrap `Feels like XX°` text (weather row needs ≈186px minimum).
- Verified headlessly at 320/390/430/500/768px: 320/390px stack compact right-aligned with no clipping or overflow; 430px side-by-side (weather 185.9px natural, gap ≈23px, pill 140x20px, button 165x44px, panel ≈326px tall vs ≈391px before); feels-like never clipped at any width or condition length, zero horizontal overflow. Reachable states were verified in the app; the `Preview Guide Unavailable` disabled edge case is verified by synthetic width simulation because the demo cannot produce a failed preview guide. `tests/roadReadiness.test.ts` and `tests/previewGuideCompletionRow.test.ts` pass, `npm run lint` and `npm run build` pass.

### 2026-08-05 — Road Readiness header: strict two-column at 390/430px, stack only at 320px

Decision:

- Final responsive policy for the compact header actions: the tested 390px and 430px phone widths are a strict two-column side-by-side header (weather left at natural width, status pill + primary action top-right) and never stack; only 320px (any width below the `min-[381px]` breakpoint) stacks the controls right-aligned below the weather. Side-by-side requires ≈324px of content width (weather ≈171px + 8px gap + actions ≈145px), which corresponds to a ≈381px viewport after the panel's 28px side padding; below that the two columns cannot fit without clipping or shrinking the locked weather typography, so they stack instead.
- `src/components/aio/TodayScreen.tsx` (`/* 1. Readiness + weather header */`): the outer container is `flex flex-col items-stretch justify-between gap-2 min-[381px]:flex-row min-[381px]:flex-wrap min-[381px]:items-start`; the weather column is `flex shrink-0 items-center` with gaps tightened to `ml-1` (icon→temp), `ml-1` (temp→divider), `pl-1` (divider→stack) for ≈170.9px natural width; the action column is `flex w-full shrink-0 flex-col items-end gap-2 min-[381px]:ml-auto min-[381px]:w-auto` so it is right-aligned full-width when stacked and pushed top-right when side-by-side. Weather, readiness, and Preview Guide behavior are unchanged.
- Status pill `px-1.5 py-0.5 text-[10px]` with an 11px icon and `gap-1`, one-line uppercase label; primary action compact white pill `min-h-11 px-1 text-[11px]` with a 12px icon, icon + label on one line, 44px touch target, never full-width. Both right-align.
- Verified headlessly at 320/365/390/430/500/768px: 320px stacks (controls right-aligned below the weather, no overflow, panel ≈421px tall); 390px strict two-column (weather 170.9px, gap ≈17.9px, pill 145.2x20px, button 144.1x44px, panel ≈325.5px); 430px strict two-column (gap ≈57.9px); 365px stacks safely because 309px of content cannot fit the ≈324px minimum; feels-like never clipped and the offline `Live weather unavailable` fallback stays one line with zero overflow at every width. `tests/roadReadiness.test.ts` and `tests/previewGuideCompletionRow.test.ts` pass (16), `npm run lint` and `npm run build` pass.

## Current Next Step

Validate the AIØ Top Header text wordmark and profile picture (320px, 390px, 430px, dark and light mode): the `AIØ` wordmark renders at `text-[34px]` with the theme text color in its original position, header height/alignment/spacing are preserved, tapping the profile avatar opens the More page, the More Account row shows the same avatar, the old header three-dots/theme buttons and logo image are gone, and dark/light mode is still reachable via the More page and Settings. Then continue validating the shared store-logo system if not already confirmed.

## Maintenance Rule

Update this document whenever one of the following changes:

- product direction
- locked visual rule
- architecture decision
- official feature behavior
- implementation phase
- important repository path
- completed milestone
- unresolved risk
- next priority

Keep temporary brainstorming in conversation until the user explicitly locks it.
