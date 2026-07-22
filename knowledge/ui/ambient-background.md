# Ambient Liquid Background System

**Created:** 2026-07-21
**Last Updated:** 2026-07-21
**Component:** `src/components/backgrounds/AmbientLiquidBackground.tsx`
**CSS:** `src/index.css` (ambient centered section)
**Replaces:** corner-anchored ambient system

---

## Purpose

Provides a slow, liquid-light animated background concentrated through the middle of the authenticated app. Deep space-black base. Color atmosphere cycles through the full product palette every ~80 seconds. Black negative space preserved around edges and lower page.

## Composition

```
             dark outer edges
  [support left]  COLOR MIDDLE  [support right]
          dark lower page and navigation
```

## Architecture

The component renders four absolutely-positioned layers inside a fixed, full-viewport container:

| Layer | Purpose | Color Cycle | Motion Duration |
|-------|---------|-------------|-----------------|
| `ambient-layer-primary` | Wide centered field, strongest | Full 8-color palette | 32s drift / 80s color |
| `ambient-layer-support-a` | Medium, offset left | Full 8-color palette (offset) | 40s drift / 80s color |
| `ambient-layer-support-b` | Smaller, offset right | Full 8-color palette (offset) | 36s drift / 80s color |
| `ambient-layer-vignette` | Dark edges, dark bottom | Static | None |

### Layer Sizes and Opacity

| Layer | Size | Opacity | Blur |
|-------|------|---------|------|
| Primary | 85vw × 50vh | 1.0 | 55px |
| Support A | 60vw × 38vh | 0.92 | 65px |
| Support B | 50vw × 30vh | 0.88 | 60px |

## Positioning

All layers centered through the middle region:

| Layer | Position | Gradient Anchor |
|-------|----------|-----------------|
| Primary | `top: 6vh; left: 50%; transform: translateX(-50%)` | `ellipse 75% 100% at 50% 50%` |
| Support A | `top: 12vh; left: 12%` | `ellipse 80% 100% at 40% 50%` |
| Support B | `top: 16vh; right: 8%` | `ellipse 85% 100% at 60% 50%` |

## Drift Limits

Motion through the middle area:

| Layer | X Range | Y Range | Scale |
|-------|---------|---------|-------|
| Primary | ±18vw | ±6vh | 0.95–1.12 |
| Support A | ±16vw | ±6vh | 0.95–1.10 |
| Support B | ±14vw | ±6vh | 0.94–1.10 |

## Vignette Overlay

The vignette uses two gradients:

1. **Radial vignette** — transparent at center (24%), darkening outward (56%), darkest at edges (82–95%)
2. **Linear gradient** — transparent at top, increasingly dark toward bottom (50% at 48vh, 82% at 72vh, 92% at bottom)

## Color Palette — 8-Phase Full Rotation

All colors derived from the product design system.

| Phase | Color | Timing |
|-------|-------|--------|
| 0% | Blue `rgba(0, 122, 255)` | 0–12% |
| 12% | Teal `rgba(20, 184, 166)` | 12–25% |
| 25% | Emerald `rgba(16, 185, 129)` | 25–37% |
| 37% | Gold `rgba(234, 179, 8)` | 37–50% |
| 50% | Amber `rgba(245, 158, 11)` | 50–62% |
| 62% | Orange `rgba(249, 115, 22)` | 62–75% |
| 75% | Pink `rgba(236, 72, 153)` | 75–87% |
| 87% | Violet `rgba(139, 92, 246)` | 87–100% |

Each phase: ~10s hold + ~2s overlap = 80s total loop.

## Animation Strategy

Two independent animation systems per layer:

1. **Motion** — `ambient-drift-*` keyframes (32–40s, `alternate`)
   - `transform`: translate, scale, rotate (organic drift)
   - `border-radius`: organic shape deformation

2. **Color shift** — `ambient-shift-*` keyframes (80s, `infinite`)
   - `@property` registered custom properties (`--amb-a-in`, `--amb-a-out`, `--amb-b-in`, `--amb-b-out`, `--amb-c-in`, `--amb-c-out`)
   - Animated through 8 palette stops

## Token Architecture

Six CSS custom properties control the gradient colors:

```css
@property --amb-a-in   /* Primary inner */
@property --amb-a-out  /* Primary outer */
@property --amb-b-in   /* Support A inner */
@property --amb-b-out  /* Support A outer */
@property --amb-c-in   /* Support B inner */
@property --amb-c-out  /* Support B outer */
```

All registered with `syntax: '<color>'` for CSS animation support.

## Space-Black Base

The deep black background is preserved by:

- Body dark: `linear-gradient(180deg, #050506 0%, #111113 100%)`
- `.dark .ios-app`: `linear-gradient(180deg, #030305 0%, #0b0b0f 42%, #111113 100%)`
- Ambient root: `position: fixed; z-index: 0`
- Vignette overlay keeps edges black

## Panel Contrast

- Page background: deepest black (`#030305`–`#050506`)
- Standard panels: dark gray-black (`#17181b` / `#0F1218`)
- Elevated panels: slightly lighter with shadow
- Border: `border-4 border-slate-950 dark:border-white`

## Performance

- Animates only `transform`, `opacity`, `border-radius`, and registered CSS properties
- `will-change: transform, opacity` on animated layers
- No JS state, no requestAnimationFrame, no React re-renders
- `pointer-events: none` on entire container
- `overflow: clip` prevents any layout impact
- `@property` registration enables GPU-accelerated color interpolation

## Z-Index Stacking

| Layer | z-index |
|-------|---------|
| Ambient liquid root | 0 (fixed) |
| Content (`.ios-app main`) | 1 (relative) |
| Bottom nav | 50 |
| AI bubble | 95 |
| AI panel | 100 |

## Reduced Motion

`@media (prefers-reduced-motion: reduce)` stops all positional movement. A very slow non-moving color fade remains (320s). Transform offsets keep layers at centered rest positions with reduced opacity.

## Responsive Behavior

| Viewport | Adjustment |
|----------|-----------|
| Desktop (>640px) | 85vw primary, 55px blur, centered |
| Mobile (≤640px) | 100vw primary, 48px blur, tighter vertical positioning |

## Design Principles

- **Color through the middle** — strongest in upper-middle and center-middle
- **Deep space-black base** — always visible at edges, lower page, between panels
- **Full palette rotation** — 8 recognizable color families, not just blue and amber
- **Controlled transitions** — one dominant, one incoming, one outgoing, no muddy gray
- **Professional vibrancy** — rich darkened palette with brighter internal accents
- **Dark lower region** — navigation and lower content stay stable

## Known Limitations

- No texture/grain layer (kept clean for performance)
- Body and `.ios-app` retain fallback linear gradients
- `@property` not supported in very old browsers (shows static initial-value colors)
