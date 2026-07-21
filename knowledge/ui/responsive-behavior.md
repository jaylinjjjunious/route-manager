# Responsive Behavior

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `src/components/*.tsx`, `src/index.css`

---

## Mobile-First Layout

The Route Manager is designed **mobile-first** — the primary target is phone-sized screens used in the field. Desktop layouts are enhanced versions of the mobile layout.

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

---

## Readability Floor

All text maintains a **minimum size of 0.75rem (12px)**:

- Enforced via CSS or utility classes
- Prevents inaccessible tiny text
- Applied to captions, labels, and auxiliary text
- Body text uses `text-sm` (14px) as the standard size
