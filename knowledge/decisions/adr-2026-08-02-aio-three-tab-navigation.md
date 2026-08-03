# ADR-D017: AIØ Three-Tab Navigation and Design System

## Status

Accepted

## Context

The app's "Mission Control" dashboard and 7-tab floating pill navigation grew dense: every field feature (jobs, battery, tracker, habits, tools, settings) competed for bottom-nav space, and the dashboard packed Next Stop, route list, weekly strip, scheduling review, and stats into a single grid. On a phone, the result was a long, mixed-purpose screen and an over-crowded nav bar.

The goal was a calmer, field-first app: a single "what should I do right now" screen, a clean schedule list, and everything else tucked away — in the visual language of a native iOS utility (big rounded surfaces, system colors, 12px minimum text).

## Decision

- Replace the primary bottom navigation with **three tabs: Today / Jobs / More**.
  - **Today** (was Dashboard) is the authoritative route-planning and route-management surface, rebuilt as an iOS-style readiness screen: hero readiness/weather header, Next Best Job (or Current Job), Travel Plan, Today's Other Jobs, and This Week strip + expanded day panel.
  - **Jobs** is the schedule list: Today, later scheduled days, Route B standby, plus overdue/unscheduled attention section and Optimize/Add actions.
  - **More** is the hub for the legacy feature tabs (Inventory, Battery, Tracker, Habits, Tools, Settings), Proof Vault, Add Process Serve, Import Screenshots, Debug Center, account card, theme toggle, and Sign Out. Legacy screens are not removed — they remain reachable.
- Introduce an **AIØ design system**: CSS custom-property tokens (`--color-aio-*`) with light defaults and `.dark` overrides in `src/index.css`, plus composable utility classes (`.aio-card`, `.aio-card-flat`, `.aio-hero-gradient`, `.aio-heading`, `.aio-label`, `.aio-caption`).
- Add shared AIØ primitives in `src/components/aio/primitives.tsx` (`AioCard`, `AioSectionLabel`, `GradientIconTile`, `StatusIndicator`, `MetricItem`, `ChecklistRow`, `AioButton`, `CompactJobRow`, `WeekDayIndicator`, `BottomTabBar`) and shared job metadata helpers in `src/components/aio/jobMeta.ts`.
- Keep all existing route/schedule logic in `App.tsx` and pass derived values into the new screen components — the Today screen performs **no fabricated scoring**, only reuses existing `nextRouteAJob`, `todayRouteJobs`, `weeklyDays`, battery, weather, and transit values.
- Add a **dev-only auth bypass** (`VITE_TODAY_SCREENSHOT_MODE=true` in `src/auth/AuthProvider.tsx`) and a Playwright screenshot script (`scripts/screenshot-today.mjs`) so the Today screen can be captured and layout-verified headlessly at 320/390/430 px in dark and light without credentials.
- The `AppTab` type grows to include `jobs` and `more`; retired route destinations remain `route`/`routes` (the standalone Jobs page no longer exists as a destination).

## Alternatives Considered

- **Keep the 7-tab pill and just restyle it** — rejected: did not address the root problem of too many primary destinations competing for attention.
- **A single scrolling dashboard with everything** — rejected: would make the primary screen even longer and harder to scan while riding.
- **Tab groups / collapsible nav** — rejected: more chrome to learn; the 3-tab model is closer to native iOS patterns and simpler to reason about.

## Consequences

- Benefits: a clear "next action" screen, reduced navigation clutter, a consistent system-color visual language, and a headless screenshot/verification path that works without real credentials.
- Tradeoffs: legacy tabs are now two taps deep (More → feature); the dashboard's old dense grid is gone, so a few glanceable stats (battery, jobs-left, earnings, revision alerts) are now summarized in the hero and progress captions rather than shown as standalone tiles.
- Risks: the iOS-style tokens are new and need real-device polish; the dev-only screenshot bypass must never be enabled by production builds (guarded by `import.meta.env.DEV`).

## Related Files

- `src/App.tsx` — tab model, header selection, screen mounting, bottom nav replacement
- `src/components/aio/` — `AioHeader.tsx`, `TodayScreen.tsx`, `JobsScreen.tsx`, `MoreScreen.tsx`, `primitives.tsx`, `jobMeta.ts`
- `src/index.css` — AIØ design tokens and component classes
- `src/auth/AuthProvider.tsx` — dev-only screenshot auth bypass
- `scripts/screenshot-today.mjs` — headless Today-screen screenshot capture
- `knowledge/ui/design-system.md`, `knowledge/ui/navigation.md`, `knowledge/ui/components.md` — UI documentation
- `knowledge/memory/current-state.md` — implementation state

## Date

2026-08-02

---

**Last Updated:** 2026-08-02 (aio-three-tab-redesign)
