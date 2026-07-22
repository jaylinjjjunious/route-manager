# Navigation System

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `src/components/BottomNav.tsx`, `src/App.tsx`

---

## Bottom Pill Navigation

The All in One 667 uses a **floating pill-shaped bottom navigation bar** pinned to the bottom of the viewport on all screen sizes.

### Tab List

| # | Tab | Icon | Protected |
|---|-----|------|-----------|
| 1 | Dashboard | — | No |
| 2 | Route | — | **Yes** |
| 3 | Jobs | — | **Yes** |
| 4 | Battery | — | **Yes** |
| 5 | Tracker | — | **Yes** |
| 6 | Habits | — | No |
| 7 | Settings | — | No |

### Protected Tabs

Tabs 2–5 (Route, Jobs, Battery, Tracker) are **locked** until the shower gate is verified. When locked:

- The tab buttons are visually dimmed or show an amber lock indicator.
- Clicking a locked tab does not navigate — it may prompt the user to verify their shower proof.
- The `isUnlocked` prop on `BottomNav` controls this behavior.

### State Management

- Tab state is managed by `currentTab` in `App.tsx`.
- Changing tabs calls `onTabChange(tabName)` which updates the parent state.
- The current tab determines which content panel is rendered.

---

## Ride Mode Behavior

When **Ride Mode** is active:

- The bottom navigation bar is **completely hidden**.
- The active tab content goes full-screen.
- Ride Mode provides an immersive, distraction-free view for navigation during rides.

---

## Touch-Friendly Scrolling

The bottom nav supports horizontal touch scrolling on small screens:

- `overflow-x-auto` — allows horizontal scroll when tabs overflow
- `snap-x` — snap-to-tab scrolling behavior
- `scroll-snap-type: x mandatory` — ensures clean snap alignment

This ensures all 7 tabs are accessible on narrow screens without requiring the user to pinch or zoom.

---

## Apple-Style Glassmorphism

The bottom nav uses a glassmorphism effect inspired by Apple's design language:

| Property | Value |
|----------|-------|
| Background | `bg-white/72` (72% opacity white) |
| Blur | `backdrop-blur-2xl` (heavy backdrop blur) |
| Border | `border-white/75` (semi-transparent white border) |

This creates a frosted glass appearance that sits above the content layer while allowing the background to show through subtly.

---

## Header Visibility

The `Header` component is conditionally rendered:

- **Hidden** on the Dashboard tab (dashboard has its own header treatment).
- **Visible** on all other tabs.
- Provides theme toggle and app title.
