# UI Design System

**Last Updated:** 2026-08-02 (aio-three-tab-redesign)
**Related Source Files:** `src/index.css`, `src/components/aio/*.tsx`

---

## AIØ Design Tokens

The AIØ surfaces (Today / Jobs / More) use an iOS-style system implemented with CSS custom properties in `src/index.css`. Light defaults are declared on `:root`; `.dark` overrides them under `@layer base`.

| Token | Light | Dark |
|-------|-------|------|
| `--color-aio-bg` | `#f2f2f7` | `#000000` |
| `--color-aio-bg-raised` | `#ffffff` | `#0c0c0e` |
| `--color-aio-surface` | `#ffffff` | `#0f0f10` |
| `--color-aio-surface-2` | `#f5f5f7` | `#1c1c1e` |
| `--color-aio-surface-elev` | `#ffffff` | `#2c2c2e` |
| `--color-aio-text` | `#1c1c1e` | `#ffffff` |
| `--color-aio-text-2` | `#8e8e93` | `#98989f` |
| `--color-aio-text-3` | `#c7c7cc` | `#48484a` |
| `--color-aio-line` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` |
| `--color-aio-blue` / `blue-2` | `#007aff` / `#0a84ff` | `#0a84ff` / `#3d9bff` |
| `--color-aio-cyan` | `#5ac8fa` | `#64d2ff` |
| `--color-aio-green` | `#34c759` | `#30d158` |
| `--color-aio-orange` | `#ff9f0a` | `#ff9f0a` |
| `--color-aio-red` | `#ff3b30` | `#ff453a` |
| `--color-aio-purple` | `#af52de` | `#bf5af2` |
| `--color-aio-yellow` | `#ffcc00` | `#ffd60a` |
| `--color-aio-teal` | `#30b0c7` | `#40c8e0` |
| `--color-aio-pink` | `#ff2d55` | `#ff375f` |

### AIØ Component Classes

| Class | Usage |
|-------|-------|
| `.aio-card` | Elevated rounded card (`rounded-[24px]`, surface background, hairline border, soft shadow) |
| `.aio-card-flat` | Flat secondary surface card |
| `.aio-hero-gradient` | Blue→teal gradient used for the readiness hero and emphasized cards |
| `.aio-heading` | Large black-heading text (`17px`, `font-black`, tight tracking) |
| `.aio-label` | Section label (`13px`, bold, secondary text) |
| `.aio-caption` | Caption / auxiliary text (`13px`, semibold, tertiary text) |

AIØ primitives live in `src/components/aio/primitives.tsx`: `AioCard`, `AioSectionLabel`, `GradientIconTile`, `StatusIndicator`, `MetricItem`, `ChecklistRow`, `AioButton`, `CompactJobRow`, `WeekDayIndicator`, and `BottomTabBar`. Job icon/type/badge metadata lives in `src/components/aio/jobMeta.ts`.

The legacy "Road" design system classes remain for legacy tabs (Inventory, Battery, Tracker, Habits, Tools, Settings).

---

## Tailwind CSS v4 Architecture

The All in One 667 uses **Tailwind CSS v4** with a utility-first approach. All styling is defined through Tailwind utility classes in JSX, with minimal custom CSS in `src/index.css`.

---

## Dark Mode

Dark mode is implemented via two mechanisms:

1. **Custom Tailwind variant** — a `dark` variant that applies styles when a `dark` class is present on a parent element.
2. **`@media (prefers-color-scheme: dark)`** — automatic dark mode based on the OS preference.

Both mechanisms work together. Users can toggle the theme manually (via the `Header` component), or let the system preference apply automatically.

---

## Component Classes (Road Design System)

The app uses a custom "Road" design system with consistent component classes:

| Class | Usage |
|-------|-------|
| `road-card` | Card container with standard padding, border radius, and background |
| `road-surface` | Surface background for panels and sections |
| `road-action` | Action button base style |
| `road-action-lg` | Large action button variant |
| `road-icon-button` | Icon-only button (square, centered icon) |
| `road-pill` | Pill-shaped element (used for navigation, tags) |
| `road-label` | Label text style (bold, small) |
| `road-value` | Value text style |
| `road-input` | Input field base style |
| `road-slider` | Range slider base style |

These classes are defined as Tailwind `@layer` utilities in `src/index.css` and compose standard Tailwind utilities.

---

## Color Scheme

| Semantic Role | Color | Usage |
|---------------|-------|-------|
| **Locked / Warning** | Amber (`amber-*`) | Shower gate locked state, unverified proof status, warnings |
| **Verified / Success** | Green (`green-*`) | Verified proof, completed tasks, success states |
| **Error** | Red (`red-*`) | Errors, failures, destructive actions |
| **Neutral** | Slate (`slate-*`) | Backgrounds, borders, secondary text |
| **Actions / Primary** | Blue (`blue-*`) | Primary action buttons, interactive elements |

---

## Typography

| Element | Class | Description |
|---------|-------|-------------|
| Headings | `font-black` | Extra bold for primary headings |
| Labels | `font-bold` | Bold for labels and emphasis |
| Body text | `text-xs` to `text-sm` | Small to standard body text |
| Readability floor | `min 0.75rem` | No text smaller than 12px (0.75rem) |

---

## Border Radius

| Usage | Class |
|-------|-------|
| Standard components | `rounded-[8px]` — custom 8px radius used throughout |
| Settings cards | `rounded-2xl` — larger radius for card containers |

The `rounded-[8px]` value is a custom Tailwind arbitrary value, applied consistently across cards, buttons, inputs, and panels.

---

## Animations

### fadeIn

A custom keyframe animation defined in `src/index.css`:

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Used for smooth appearance of components, modals, and status transitions.

---

## Layout & Spacing

- **Mobile-first** responsive design
- **Bottom navigation** as a floating pill (fixed to bottom)
- **Grid layouts** that adapt: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3`
- **Consistent padding** via utility classes (no custom spacing scale)
