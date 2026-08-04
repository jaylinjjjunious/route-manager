# AIØ UI Panel Glossary

This file is the canonical source of truth for official screen, panel, feature, workflow, and system names used throughout the AIØ app.

Use these exact names in future prompts, issues, reviews, documentation, and code discussions. Do not rename an entry without explicitly updating this file.

Each entry must include a **code locator** so a CLI agent can jump directly to the implementation without searching unrelated files.

## Today Screen

### Locked Today-screen order

From top to bottom on the Today screen (`src/components/aio/TodayScreen.tsx`, in `#tab-view-today`):

1. Road Readiness Panel — `/* 1. Readiness + weather header */`
2. Next Best Job / Current Job Panel — `/* 2. Next Best Job / Current Job */`
3. Today's Other Jobs Panel — `/* 3. Today's Other Jobs */`
4. Travel Plan Panel — `/* 4. Travel Plan */`
5. This Week — `/* 5. This Week */`

This order is the locked layout. Do not move a panel to a different position on the Today screen without explicit approval.

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
- **Current review status:** Card structure, pay tile, actions, and logic unchanged. This pass refined the contrast of the three square information tiles (Distance, Ride, Due) to neutral high-contrast metric tiles, not color-coded tiles. The job identity square (the large tile left of the store name) now uses the shared store-logo system via `StoreLogo` — a matched store logo renders with `object-contain` at the same `h-14 w-14 rounded-[18px]` size, and the generic icon is the fallback. Only the weather icon in Travel Plan and other non-job squares keep their generic appearance.
- **Locked visual direction:** Keep the entire panel layout, size, spacing, buttons, content, and behavior unchanged. All three square metric tiles (Distance, Ride, Due) use one consistent neutral dark surface, slightly lighter than the main card, with a clearer border and a subtle inner top highlight for depth. Labels are brightened from dim gray to a muted white; values stay bold white. No separate slate, purple, or amber backgrounds — the three tiles stay in the same neutral family and no longer compete with each other. The Due tile may carry only a subtle warm amber accent in its label, remaining on the same neutral surface. No bright warning red is used unless existing logic already signals late/overdue. No clipping or overlap at 320px, 390px, or 430px.
- **Primary code file:** `src/components/aio/TodayScreen.tsx`
- **Primary component:** `TodayScreen`
- **Code section marker:** `/* 2. Next Best Job / Current Job */`
- **Current root element:** `<section aria-label="Next job">`
- **Primary card:** `AioCard className="mt-2.5 p-5" gradient={hasCurrentJob}`
- **Metric tiles:** a `grid grid-cols-3 gap-2.5` of three `MetricItem` elements (labels `Distance`, `Ride`, `Due`) inside the job card
- **Relevant inputs/state:** `primaryJob` (`currentJob || nextJob`), `hasCurrentJob`, `nextJob`, `currentJob`, `remainingJobs`, `nextStopDistance`, `nextStopRideMinutes`, `dueLabel(primaryJob)` (uses `job.dueTime`, else `Flex`), `nextStopNavLink`, `jobAccessLocked`, `completingJobIds`, `routeProgressPct`, `earningsAmount`/`earningsTitle`/`earningsFooter`, `completedJobsCount`, `routeTotalJobs`, `onToggleJobProgress`, `onOpenJob`, `onBlockJobAccess`, `onAddJob`
- **Related shared primitives:** `AioCard`, `AioSectionLabel`, `StatusIndicator`, `MetricItem`, `AioButton` from `src/components/aio/primitives` (the `MetricItem` label-color override `labelClassName` was added for this panel); `StoreLogo` from `src/components/aio/StoreLogo.tsx` for the job identity square
- **Focused tests:** no dedicated test file; covered indirectly by the general suite. Road Readiness state tests: `tests/roadReadiness.test.ts`, `tests/previewGuideCompletionRow.test.ts`; store-logo registry tests: `tests/storeLogos.test.ts`
- **CLI instruction:** Start in `src/components/aio/TodayScreen.tsx`, locate the comment `/* 2. Next Best Job / Current Job */`, and edit only that section plus the directly related `MetricItem` shared primitive. Do not modify the Road Readiness Panel, job recommendation logic, the job title or address layout, the Pay tile, the `Navigate` button, the `Under Review`/`Complete Job` button, the `Job details` action, Travel Plan, Other Jobs, This Week, the bottom navigation, the floating assistant controls, or unrelated shared styles.

### Today's Other Jobs Panel

- **Location in UI:** On the Today screen, directly below the Next Best Job / Current Job Panel and above the Travel Plan panel, under the section marker `/* 3. Today's Other Jobs */`.
- **Purpose:** Lists today's remaining jobs (everything except the primary Next Best Job / Current Job card) as compact rows showing store name, address, price, and status badge, each opening the job details on tap. A revision-attention banner sits above the list when revisions need attention, and an empty state reads `Nothing else scheduled for today.`
- **Current review status:** Panel layout, row height, square size, spacing, text, prices, status badges, chevrons, and behavior are unchanged. This pass replaced the generic job icon square in each row with a matching store logo from the store-logo registry; jobs with no match keep the generic icon. The store-logo system is shared across all job identity squares on the Today screen, including this panel and the Next Best Job / Current Job Panel.
- **Locked visual direction:** Each row's icon square keeps the existing `h-11 w-11 rounded-[14px]` dimensions and spacing. Matched logos render with `object-contain` (no cropping), restrained internal padding (`p-1.5`), and a neutral `--color-aio-surface-2` background with a subtle `--color-aio-line` border so white-background and transparent logos both read in dark and light mode. Logos are not stretched, recolored, redrawn, or cropped. Meaningful alt text uses the store display name. If no store matches or the logo image fails to load, the current generic `GradientIconTile` icon renders instead. The Next Best Job / Current Job identity square uses the same renderer at `lg` size (`h-14 w-14 rounded-[18px]`).
- **Primary code file:** `src/components/aio/TodayScreen.tsx`
- **Primary component:** `TodayScreen`
- **Code section marker:** `/* 3. Today's Other Jobs */`
- **Current root element:** `<section aria-label="Today's other jobs">`
- **Primary card:** `AioCard className="mt-2.5 p-2"` containing a `divide-y divide-[var(--color-aio-line)]` list of `CompactJobRow`s
- **Store logo registry:** `src/services/storeLogos.ts` (entries, `normalizeStoreText`, `normalizeCompanyId`, `resolveStoreLogo`) — shared by every job identity square on the Today screen
- **Store logo UI:** `src/components/aio/StoreLogo.tsx` (renders matched logo or falls back to the generic icon; `size` `md` for rows, `lg` for the Next Best Job / Current Job identity square)
- **Registered stores:** `foods-co`, `sprouts`, `bevmo`, `walgreens`, `dollar-general`, `family-dollar`, `vons`, `target`, `albertsons` (assets in `public/store-logos/*.svg`)
- **Relevant inputs/state:** `otherJobs` (`remainingJobs` filtered to exclude `primaryJob`), `revisionAlerts`, `onOpenJob`, and per-row `job.storeName`/`job.notes` (resolved via the logo registry; stored jobs are never mutated)
- **Related shared primitives:** `AioSectionLabel`, `AioCard`, `CompactJobRow` (optional `iconSlot` prop) from `src/components/aio/primitives`; `GradientIconTile` and `getJobIconMeta` used for the fallback
- **Focused tests:** `tests/storeLogos.test.ts`
- **CLI instruction:** Start in `src/components/aio/TodayScreen.tsx`, locate the comment `/* 3. Today's Other Jobs */`, and edit only that section plus the store-logo module (`src/services/storeLogos.ts`), the `StoreLogo` component (`src/components/aio/StoreLogo.tsx`), and the `CompactJobRow` `iconSlot` hook. Do not modify the Road Readiness Panel, Next Best Job / Current Job Panel, Travel Plan, This Week, bottom navigation, the floating assistant controls, stored job data, or unrelated shared styles. New stores are added to the registry, not hard-coded in the row render.

### Travel Plan Panel

- **Location in UI:** On the Today screen, directly below the Today's Other Jobs Panel and above This Week, under the section marker `/* 4. Travel Plan */`.
- **Purpose:** Shows the travel plan for the primary job (Next Best Job / Current Job): estimated transit/bike duration, leave-by time to arrive on time, deadline urgency, and the Optimize Route / Open Route actions. A `Speak Route` / `Stop` button in the section header speaks the route aloud (`onSpeakRoute`). Without a primary job it shows the empty state `Add a job to see its travel plan.`
- **Current review status:** Panel layout, content, spacing, route speech behavior, transit state handling, deadline styling, empty state, and actions are unchanged. This pass only moved the panel's position on the Today screen from directly below Next Best Job / Current Job (section 3) to directly below Today's Other Jobs (section 4).
- **Primary code file:** `src/components/aio/TodayScreen.tsx`
- **Primary component:** `TodayScreen`
- **Code section marker:** `/* 4. Travel Plan */`
- **Current root element:** `<section aria-label="Travel plan">`
- **Primary card:** `AioCard className="mt-2.5 p-5"`
- **Relevant inputs/state:** `primaryJob` (`currentJob || nextJob`), `transit` (`UseTransitTripResult`), `leaveBy` (`formatLeaveByTime`), `deadline` (`deadlineComparison`), `mapsUrl` (`getTransitMapsUrls` full link or `nextStopNavLink`), `nextStopRideMinutes`, `onSpeakRoute`, `isSpeaking`, `onOptimizeRoute`
- **Related shared primitives:** `AioSectionLabel`, `AioCard`, `AioButton`, `GradientIconTile` (weather-style `CloudSun` icon; not a job identity square and not a store-logo slot), `StatusIndicator` from `src/components/aio/primitives`
- **Focused tests:** none dedicated; route speech and transit behavior are covered indirectly by the general suite
- **CLI instruction:** Start in `src/components/aio/TodayScreen.tsx`, locate the comment `/* 4. Travel Plan */`, and edit only that section. Do not modify the Road Readiness Panel, Next Best Job / Current Job Panel, Today's Other Jobs Panel, This Week, route logic, job ranking or sorting, Travel Plan behavior, Today's Other Jobs behavior, the bottom navigation, the floating assistant controls, or unrelated shared styles.

## Jobs Screen

### Jobs Page

- **Location in UI:** The second tab of the AIØ bottom navigation (`Jobs`). Rendered via `JobsScreen`; the page is anchored by `<div className="space-y-5" id="tab-view-jobs">`.
- **Purpose:** Lists the user's scheduled jobs: an overdue/unscheduled attention card, the `Today` list, one section per later scheduled day, and a `Route B Standby` section. Every list uses `CompactJobRow` rows that open the job details on tap.
- **Current review status:** No layout, row height, spacing, text, badges, buttons, prices, filters, search, sorting, or scheduling behavior changed. This pass replaced each row's generic job icon square with the shared store-logo system so every job identity square on the Jobs page renders a matching store logo (`object-contain`, existing `h-11 w-11 rounded-[14px]` square, neutral logo background and border). Unknown stores and failed image loads keep the generic icon. The overdue/unscheduled attention rows have no job identity square and are unchanged.
- **Primary code file:** `src/components/aio/JobsScreen.tsx`
- **Primary component:** `JobsScreen`
- **Nearest stable anchor:** the root `id="tab-view-jobs"`; sections are labeled `aria-label="Today's jobs"`, `aria-label={dayLabel(day.date)}` (per later day), and `aria-label="Route B standby"`. There is no comment marker in this file.
- **Root element:** `<div className="space-y-5" id="tab-view-jobs">`
- **Job-square locations:** the three `CompactJobRow` usages, each passing `iconSlot={<StoreLogo job={job} />}`:
  - Today list: `props.todayJobs.map(...)` under `<section aria-label="Today's jobs">`
  - Later days: `day.jobs.map(...)` inside the `laterDays` map (`props.weekDays.slice(1)` filtered to non-empty)
  - Route B Standby: `props.routeBJobs.map(...)` under `<section aria-label="Route B standby">`
- **Relevant inputs/state:** `today`, `todayJobs`, `weekDays` (`ScheduledDaySummary[]`), `routeBJobs`, `overdueJobs`, `unscheduledJobs`, `onOpenJob`, `onAddJob`, `onOptimizeRoute`, `onMoveToDay`; per-row `job.storeName`/`job.notes` resolved via the logo registry (stored jobs are never mutated)
- **Shared store-logo files:** resolver/registry `src/services/storeLogos.ts`; renderer `src/components/aio/StoreLogo.tsx` (default `size="md"` used here) — the same system used by the Today screen's Next Best Job / Current Job and Today's Other Jobs panels; assets in `public/store-logos/*.svg`
- **Related shared primitives:** `AioCard`, `AioSectionLabel`, `AioButton`, `CompactJobRow` (optional `iconSlot` prop) from `src/components/aio/primitives`
- **Focused tests:** `tests/jobsScreenStoreLogo.test.ts`, `tests/storeLogos.test.ts`
- **CLI instruction:** Start in `src/components/aio/JobsScreen.tsx`, locate the root `id="tab-view-jobs"`, and edit only the job-row squares (the three `CompactJobRow` `iconSlot` usages) plus the shared store-logo module and `StoreLogo` component. Do not modify the Today screen panels, Road Readiness, Travel Plan, job ranking or sorting, job status logic, filters, search, scheduling behavior, job details behavior, bottom navigation, the overdue/unscheduled attention card layout, or unrelated shared styles. New stores are added to the registry, not hard-coded in the row render.

## Job Details Mini Page

- **Location in UI:** Full-screen bottom-sheet modal opened by tapping any job card/row on the Today screen (Next Best Job / Current Job Panel and Today's Other Jobs Panel) and the Jobs page rows. Mounted from `src/App.tsx` under the marker `{/* Job Detail Mini Page Modal */}` via `routeDetailJob` → `JobDetailModal`.
- **Purpose:** Focused mini page for a single job: status badge, store identity square + store name + address, pay block, type/duration/deadline/scheduled tiles, Move-to-day, Preview Guide, transit-to-job, inventory custody, notes, quick status controls, status history, Smart Aisle Scan, admin actions, and a sticky Navigate footer.
- **Current review status:** The frosted-glass treatment is approved and applied: the overlay is `bg-black/35` with `backdrop-blur-[6px]`, and the card is `bg-[#111214]/[0.80]` with `backdrop-blur-[14px]` and `border-white/[0.12]` (webkit variants included for iOS). The job identity square beside the store name now uses the shared store-logo system via `StoreLogo` at the default `md` size (`h-11 w-11 rounded-[14px]`, `object-contain`); unknown stores and failed image loads keep the existing generic `GradientIconTile` fallback. The status-toggle button (Hourglass for normal pending, blue `CheckSquare` for completed, indigo `CheckSquare` for under review) is unchanged and never contains the store logo. No stored job data is mutated.
- **Primary code file:** `src/components/JobDetailModal.tsx`
- **Primary component:** `JobDetailModal`
- **Mount point:** `src/App.tsx` marker `{/* Job Detail Mini Page Modal */}` (`routeDetailJob` state, close via `setRouteDetailJobId(null)`)
- **Job identity square locator:** in `JobDetailModal.tsx`, the title row `<div className="flex items-start gap-3">` under the comment `{/* Job title and pay - stacked on mobile */}` — the first child is `<StoreLogo job={job} />` (md), followed by the status-toggle button, then the store name/address block.
- **Approved glass treatment:** overlay `bg-black/35 backdrop-blur-[6px]`; card `bg-[#111214]/[0.80] backdrop-blur-[14px] border-white/[0.12]`.
- **Status-toggle button behavior:** Hourglass for the normal pending state; existing `CheckSquare` states for completed (`text-blue-500`) and under_review (`text-indigo-500`); the store logo is never placed inside the status button.
- **Shared store-logo files:** resolver/registry `src/services/storeLogos.ts`; renderer `src/components/aio/StoreLogo.tsx` (default `size="md"`); assets in `public/store-logos/*.svg` — the same system used by the Today screen and Jobs page. New stores are added to the registry, not hard-coded here.
- **Relevant inputs/state:** `job`, `routeIndex`, `legDistance`, `rideMinutes`, `navLink`, `isOutlier`, `jobAccessLocked`, `onToggleComplete`, `onEdit`, `onDelete`, `onDuplicate`, `onToggleRoute`, `onUpdateStatus`, `onOpenScan`, `transitOrigin`, `onMoveToDay`, `onClose`; per-job `job.storeName`/`job.notes` resolved via the logo registry (stored jobs are never mutated)
- **Focused tests:** `tests/jobDetailModalStoreLogo.test.ts`, `tests/storeLogos.test.ts`
- **CLI instruction:** Start in `src/components/JobDetailModal.tsx`, locate the title row `<div className="flex items-start gap-3">`, and edit only that row plus the shared store-logo module/component and the approved glass classes on the modal overlay/card. Do not modify the store-logo registry or `public/store-logos/*.svg` assets, stored job data, the quick-status logic, or other screens/panels.

## Naming Rules

- Every major screen, panel, workflow, feature, and system receives one official name.
- New names are added here during review before implementation work proceeds.
- Every entry must include the primary file, component, code marker, relevant inputs, and related shared files.
- Future AI prompts must refer to the official names in this file.
- A name describes one specific interface or system only; avoid overlapping names.
- CLI agents must stay inside the named panel's code boundary unless the task explicitly authorizes related changes.
