# Navigation System

## Guest entry (2026-10-25)

Route Manager's All in One sign-in page includes **Bypass sign-in** below Sign In. It enters a usable isolated Guest workspace, with Today/Jobs navigation, Add/Edit job, completion/reopen, starting address and Maps directions. The guest-entry marker survives reload and same-tab Main menu → Route Manager round trips; Sign in exits guest mode explicitly. Guest jobs use a separate browser-only key, never account caches. Account/cloud/proof/inventory/admin restrictions are visible. This replaces the rejected menu-only redirect.

## Cleaning account sync

CloudWorkspace provides shared-account sign-in, owner-scoped App mounting, visible local/cloud status and retry, explicit browser-plan import, conflict choices and downloadable recovery copies. Existing offline planning/backups remain. See ../features/cleaning-planner.md.

## Mark finished from Today (2026-10-21)

Bathroom Today offers Mark finished without requiring a timer session. An initially unchecked checklist lists only due activities; Save advances only selected activities from the actual local completion date. Unselected work stays due; finished work appears in Upcoming and an expandable finished-today summary. Latest completion dates persist in existing v4 bathroom.lastDone and backups; no timer/session/history duration is invented. Active sessions use the existing Clock out path instead. Undo last finish is available in the current page lifetime, only while the schedule still matches that save and no session is active; reload/other-tab updates clear the shortcut. Saved-data errors retain the checklist and due list. Existing session clock-out is unchanged.


## Route Manager left sidebar (2026-10-21)

AIØ17 is now the navigation trigger on every Route Manager page: clicking the wordmark or header profile photo, or swiping right at least 64px from the leftmost 24px opens a modal left sidebar. The header profile photo stays at its original right-hand position. The sidebar contains the same retained profile controls below the photo/name divider. Close button, Escape, backdrop click, left swipe, or feature selection closes it. Native dialog provides modal focus containment/restoration and inert background; body scrolling is locked while open. Edge gestures ignore vertical movement, form fields and other modal workflows. Full viewport height, internal scrolling, safe-area padding and reduced-motion animation support narrow devices. This supersedes the avatar-anchored popover; no routing, feature data or account behavior changed. Below its divider: starting-address form, light/dark toggle, Monthly Check-In, Proof Vault, Inventory, expandable Ride tools (Battery/Tracker/Transit), Habits, expandable Support & diagnostics, admin-only Admin Portal/Diagnostics Console, Change password and Sign out. No Gmail row or Open More action. More and Settings pages and the More bottom tab are removed; old #more/#settings hashes normalize to Today. Bottom navigation contains Today and Jobs; feature-page Back returns to Today. Page changes scroll to the top so the sticky header cannot cover page actions. Jobs owns screenshot import and Add Process Serve. Smart Aisle Scan remains attached to job details. Transit tools no longer duplicates scan/import. Support retains Debug Center and Transit API status; enabled dev test helpers remain under Support. Sample-stop reset and Settings manual are removed from the UI. Saved feature data, auth/permissions and existing gates remain unchanged. The sidebar scrolls within the viewport.

Bathroom is now the primary Cleaning Today dashboard. Start cleaning → due-only review → Get ready → Clock in → Clock out. Preparation Back returns to the selected Bathroom review. Other spaces/tasks are expandable on Today; Spaces/History and parent menu still work.

## Cleaning room (2026-10-20)

Hallway now opens Route Manager or Cleaning through separate document URLs. Cleaning owns /cleaning/ with #today, #spaces, #history and a visible Main menu link to /#home. Backup controls are in its header/footer. No Route Manager account data or navigation appears in this room.

## Independent hallway and room (2026-10-19)

Compatibility follow-up: legacy hash changes are handled even when hallway is already open. Room startup and App share the retired-route policy: `#jobs` stays a first-class Jobs destination; only `#route` and `#routes` retire to Today. Legacy `/jobs` pathname routing remains compatible. Local production-mode bookmark navigation and focused auth/location tests verify the distinction.

Parent `/` and `/#home` open the independent `apps/hallway` app. It is a public software directory with no account data or room-code imports. Its Route Manager link performs document navigation to `/route-manager/#dashboard`, served by the room's separate process/build. SoftwareShell was removed from Route Manager. The room retains Today / Jobs and its login/sign-out controls. Its Main menu link performs document navigation back to the parent; it is hidden during immersive Ride Mode. Existing root feature hashes redirect to the room, and both prefixed and legacy auth paths work. Same-origin browser storage/session keys are preserved. `.app-shell` uses horizontal `clip` rather than `hidden`, allowing the return/header group to remain sticky against the viewport. Future software is not implemented; add a URL entry rather than a room-code import.

**Last Updated:** 2026-08-02 (aio-three-tab-redesign)
**Related Source Files:** `src/App.tsx`, `src/components/aio/primitives.tsx`

---

## AIØ Primary Navigation

The All in One 667 uses **two primary tabs** — Today / Jobs / More — rendered as a floating rounded bottom bar pinned to the bottom of the viewport on all screen sizes.

### Primary Tab List

| # | Tab | Component | Icon | Responsibility |
|---|-----|-----------|------|----------------|
| 1 | Today | `TodayScreen` | CalendarDays | Authoritative route-planning surface: readiness/weather hero, Next Best Job / Current Job, Today's Other Jobs, Travel Plan, This Week strip + expanded day panel |
| 2 | Jobs | `JobsScreen` | ListChecks | Schedule list: Today, later scheduled days, Route B standby, overdue/unscheduled attention section |

The Jobs tab shows a red count badge for remaining jobs today.

### Feature pages (reachable from the profile panel)

| Tab | Icon | Protected |
|-----|------|-----------|
| Inventory | PackageCheck | No |
| Battery | Battery | **Yes** |
| Tracker | Timer | **Yes** |
| Habits | Award | No |
| Tools | Camera | No |

Battery and Tracker are **available without verification while the temporary bypass is active**. If SHOWER_GATE_REQUIRED is set to true, they are locked until the shower gate is verified. When locked:

- The tab buttons are visually dimmed or show an amber lock indicator.
- Clicking a locked tab does not navigate — it may prompt the user to verify their shower proof.
- `showerGateUnlocked` and `activateTabFromTap` in `App.tsx` control this behavior.

### State Management

- Tab state is managed by `currentTab` in `App.tsx`.
- The `AppTab` union includes `dashboard | jobs` plus the legacy tabs.
- `BottomTabBar` (in `primitives.tsx`) maps `today`/`jobs` onto `dashboard`/`jobs` in `App.tsx`.
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

## 2026-09-26 update

More includes Monthly Check-In (checkin tab), available even while job access is locked. Completed monthly status is viewed there; Today/Jobs only show the incomplete coaching panel.
