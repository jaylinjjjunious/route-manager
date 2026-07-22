# Responsive Behavior

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `src/components/*.tsx`, `src/index.css`

---

## Mobile-First Layout

The All in One 667 is designed **mobile-first** — the primary target is phone-sized screens used in the field. Desktop layouts are enhanced versions of the mobile layout.

---

## Bottom Navigation

The floating pill bottom nav is present on **all screen sizes**:

- Fixed to the bottom of the viewport
- Centered horizontally
- Same size and behavior on mobile and desktop
- Not affected by viewport width changes

---

## Camera Viewfinder

The shower proof camera interface uses:

- `aspect-video` — 16:9 aspect ratio container
- Responsive scaling — fills available width on mobile, constrained on larger screens
- Touch-friendly capture button — minimum 48px touch target

---

## Grid Layouts

Grid layouts adapt across breakpoints:

| Breakpoint | Columns | Usage |
|------------|---------|-------|
| Default (mobile) | `grid-cols-1` | Single column stacking |
| `sm` (≥640px) | `sm:grid-cols-2` | Two-column layout |
| `lg` (≥1024px) | `lg:grid-cols-3` | Three-column layout for dashboard, job lists |

This pattern is used for job cards, stat displays, and dashboard panels.

---

## Ride Mode

Ride Mode is a **full-screen immersive view** on mobile:

- Hides the bottom navigation
- Expands content to fill the entire viewport
- Designed for one-handed use while riding
- Larger touch targets for interaction

On desktop, Ride Mode may render in a contained panel rather than full-screen.

---

## Touch Targets

All interactive elements meet the **minimum 48px touch target** requirement:

- Buttons: minimum 48px height
- Tab icons in bottom nav: 48px touch area
- Form inputs: 48px height
- Action buttons: `road-action` and `road-action-lg` classes enforce minimum sizing

---

## iOS Safe Area

The layout accounts for iOS safe areas:

- Bottom navigation accounts for the home indicator bar on notched iPhones
- Padding adjustments prevent content from being obscured by system UI
- `env(safe-area-inset-bottom)` may be used for bottom spacing

### Assistant Bubble and Panel (safe-area-aware)

The assistant bubble and panel use `env(safe-area-inset-bottom)` for positioning:

- **Bubble button**: `bottom: max(5.5rem, calc(5.5rem + env(safe-area-inset-bottom)))` — always clears the bottom nav + safe area
- **Panel composer**: `paddingBottom: max(0.75rem, env(safe-area-inset-bottom))` — input clears the home indicator
- **Panel container**: `h-dvh` on mobile (100dvh, dynamically adjusts for virtual keyboard), `sm:h-[600px]` on desktop

### Assistant Panel Layout

| Viewport | Container | Behavior |
|----------|-----------|----------|
| Mobile (<640px) | `fixed inset-0 h-dvh z-[100]` | Full-screen, fills entire viewport including safe areas |
| Desktop (≥640px) | `fixed bottom-24 right-4 w-[400px] h-[600px] max-h-[80vh] z-[100]` | Floating drawer, rounded corners, border, shadow |

Flex chain inside the panel:
- Root: `h-full min-h-0 flex flex-col` — fills container
- Header: `shrink-0` — fixed height, never compresses
- MessageList: `flex-1 overflow-y-auto` — fills remaining space, scrolls
- Composer: `shrink-0` — fixed height, never compresses

---

## Readability Floor

All text maintains a **minimum size of 0.75rem (12px)**:

- Enforced via CSS or utility classes
- Prevents inaccessible tiny text
- Applied to captions, labels, and auxiliary text
- Body text uses `text-sm` (14px) as the standard size
