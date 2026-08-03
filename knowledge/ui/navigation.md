# Navigation System

**Last Updated:** 2026-08-02 (aio-three-tab-redesign)
**Related Source Files:** `src/App.tsx`, `src/components/aio/primitives.tsx`

---

## AIØ Three-Tab Navigation

The All in One 667 uses **three primary tabs** — Today / Jobs / More — rendered as a floating rounded bottom bar pinned to the bottom of the viewport on all screen sizes.

### Primary Tab List

| # | Tab | Component | Icon | Responsibility |
|---|-----|-----------|------|----------------|
| 1 | Today | `TodayScreen` | CalendarDays | Authoritative route-planning surface: readiness/weather hero, Next Best Job / Current Job, Travel Plan, Today's Other Jobs, This Week strip + expanded day panel |
| 2 | Jobs | `JobsScreen` | ListChecks | Schedule list: Today, later scheduled days, Route B standby, overdue/unscheduled attention section |
| 3 | More | `MoreScreen` | Ellipsis | Hub for all legacy feature tabs and actions |

The Jobs tab shows a red count badge for remaining jobs today.

### Legacy Tabs (reachable from More)

| Tab | Icon | Protected |
|-----|------|-----------|
| Inventory | PackageCheck | No |
| Battery | Battery | **Yes** |
| Tracker | Timer | **Yes** |
| Habits | Award | No |
| Tools | Camera | No |
| Settings | Settings | No |

Battery and Tracker are **available without verification while the temporary bypass is active**. If SHOWER_GATE_REQUIRED is set to true, they are locked until the shower gate is verified. When locked:

- The tab buttons are visually dimmed or show an amber lock indicator.
- Clicking a locked tab does not navigate — it may prompt the user to verify their shower proof.
- `showerGateUnlocked` and `activateTabFromTap` in `App.tsx` control this behavior.

### State Management

- Tab state is managed by `currentTab` in `App.tsx`.
- The `AppTab` union includes `dashboard | jobs | more` plus the legacy tabs.
- `BottomTabBar` (in `primitives.tsx`) maps `today`/`jobs`/`more` onto `dashboard`/`jobs`/`more` in `App.tsx`.
- The current tab determines which content panel is rendered.

---

## Ride Mode Behavior

When **Ride Mode** is active:

- The bottom navigation bar is **completely hidden**.
- The active tab content goes full-screen.
- Ride Mode provides an immersive, distraction-free view for navigation during rides.

---

## Header Visibility

The header depends on the active tab:

- **Today, Jobs, and More** use the `AioHeader` component (greeting, AIØ wordmark, date, theme toggle, and a More shortcut button).
- **All legacy tabs** use the original `Header` component (logo, title, e-bike status, user email, theme toggle).

---

## Standalone Route Destination

The standalone Route tab was retired. Today's Screen (Dashboard) is the authoritative interface for route planning and route management, including Next Best Job, Current Job, per-job detail, navigation actions, review/complete actions, move controls, revision alerts, route order, route calculations, and the weekly scheduling strip / expanded day panel (Phase 1 scheduling).

Retired route destinations (`/route`, `/routes`, and `#route`) redirect to Dashboard. Assistant route requests also open Dashboard and focus Today's Route when possible. The standalone Jobs page destination was retired as well (`jobs` no longer redirects; it is a first-class tab).

---

## AIØ Header

The `AioHeader` component is sticky at the top and conditionally rendered:

- **Shown** on the Today, Jobs, and More tabs.
- **Hidden** on legacy tabs (those use the classic `Header`).
- Provides greeting, AIØ wordmark, formatted date, theme toggle, and a More shortcut.
