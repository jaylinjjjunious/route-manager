# Ambient Liquid Background System

**Created:** 2026-07-21
**Last Updated:** 2026-07-21
**Component:** `src/components/backgrounds/AmbientLiquidBackground.tsx`
**CSS:** `src/index.css` (ambient-liquid-* section)
**Replaces:** `.ios-page-glow` static gradient div

---

## Purpose

Provides a slow, liquid-light animated background anchored to the upper corners. Strong color glow in the upper-left and upper-right, dark center, dark lower half. Colors cycle through the product palette while the composition remains stable.

## Composition

```
[blue/palette glow]     dark center     [amber/palette glow]
          dark operational content area
          dark lower page and navigation
```

## Architecture

The component renders five absolutely-positioned layers inside a fixed, full-viewport container:

| Layer | Anchor | Color Cycle | Duration |
|-------|--------|-------------|----------|
| `ambient-blue-primary` | Upper-left corner | Blue → Indigo → Emerald → Blue-deep | 140s color / 28s drift |
| `ambient-blue-secondary` | Upper-left offset | iOS Blue → Emerald-deep → Blue → Indigo | 160s color / 36s drift |
| `ambient-amber-primary` | Upper-right corner | Amber → Rose → Amber-warm | 150s color / 32s drift |
| `ambient-amber-secondary` | Upper-right offset | Amber-warm → Rose-muted → Amber | 130s color / 40s drift |
| `ambient-dark-overlay` | Full viewport | Dark center/lower gradient | Static |

## Positioning

All layers are anchored deep into their respective corners:

| Layer | Position | Gradient Anchor |
|-------|----------|-----------------|
| Left primary | `top: -20vh; left: -18vw` | `radial-gradient at 12% 12%` |
| Left secondary | `top: -10vh; left: -8vw` | `radial-gradient at 18% 18%` |
| Right primary | `top: -20vh; right: -18vw` | `radial-gradient at 88% 12%` |
| Right secondary | `top: -10vh; right: -8vw` | `radial-gradient at 82% 18%` |

The gradient focal points are near the corner edges, not at element center. This ensures the strongest color is near the viewport corner with soft falloff inward.

## Drift Limits

Motion is constrained to stay within corner zones:

| Layer | X Range | Y Range |
|-------|---------|---------|
| Left primary | -2vw to +3vw | 0vh to +4vh |
| Left secondary | -3vw to +2vw | -2vh to +4vh |
| Right primary | -4vw to 0vw | -3vh to +3vh |
| Right secondary | -3vw to +3vw | -2vh to +4vh |

No layer moves more than ~4vw from its corner origin. The center stays dark.

## Dark Overlay

The dark overlay uses two gradients:

1. **Radial vignette** — transparent at top center (8%), darkening through the center (35–65%), darkest at edges (92%)
2. **Linear gradient** — transparent at top, increasingly dark toward bottom (30% at 30vh, 65% at 60vh, 85% at bottom)

This ensures:
- Corner glows remain visible through the top
- Center is dark
- Lower half is dark
- No white outer halo

## Color Palette

All colors derived from the product design system. No invented colors.

### Cool Side (Left — Layers 1 & 2)

| Name | Inner Color | Outer Color | Derived From |
|------|-------------|-------------|-------------|
| Blue | `rgba(0, 122, 255, 0.30)` | `rgba(0, 90, 210, 0.12)` | Apple blue (#007AFF) |
| Blue-deep | `rgba(29, 78, 216, 0.26)` | `rgba(20, 55, 180, 0.10)` | blue-700 |
| Indigo | `rgba(99, 102, 241, 0.26)` | `rgba(79, 82, 200, 0.10)` | indigo-500 (#6366F1) |
| Emerald | `rgba(16, 185, 129, 0.22)` | `rgba(10, 150, 105, 0.09)` | emerald-500 (#10B981) |
| Emerald-deep | `rgba(5, 150, 105, 0.20)` | `rgba(5, 120, 85, 0.08)` | emerald-600 (#059669) |

### Warm Side (Right — Layers 3 & 4)

| Name | Inner Color | Outer Color | Derived From |
|------|-------------|-------------|-------------|
| Amber | `rgba(200, 140, 40, 0.26)` | `rgba(180, 110, 20, 0.11)` | Amber (#C88C28) |
| Amber-warm | `rgba(180, 120, 30, 0.22)` | `rgba(160, 100, 20, 0.09)` | amber-600 tone |
| Rose | `rgba(200, 60, 80, 0.18)` | `rgba(180, 50, 65, 0.08)` | rose-500 (#F43F5E) muted |
| Rose-muted | `rgba(180, 50, 70, 0.16)` | `rgba(160, 40, 55, 0.07)` | rose-600 (#E11D48) muted |

## Animation Strategy

Two independent animation systems run simultaneously on each layer:

1. **Motion** — `ambient-drift-*` keyframes (28–40s, `alternate`)
   - `transform`: translate (constrained), scale, rotate
   - `border-radius`: organic shape deformation
   - `opacity`: subtle breathing

2. **Color shift** — `ambient-shift-*` keyframes (130–160s, `infinite`)
   - `@property` registered custom properties (`--amb-color-1` through `--amb-color-4b`)
   - Animated through palette stops at smooth intervals
   - Different durations per layer prevent synchronized color changes

## Token Architecture

Eight CSS custom properties control the gradient colors:

```css
@property --amb-color-1  /* Layer 1 inner */
@property --amb-color-1b /* Layer 1 outer */
@property --amb-color-2  /* Layer 2 inner */
@property --amb-color-2b /* Layer 2 outer */
@property --amb-color-3  /* Layer 3 inner */
@property --amb-color-3b /* Layer 3 outer */
@property --amb-color-4  /* Layer 4 inner */
@property --amb-color-4b /* Layer 4 outer */
```

All registered with `syntax: '<color>'` for CSS animation support.

To edit the palette, modify the `ambient-shift-*` keyframes and the `@property` initial-values in `src/index.css`.

## Performance

- Animates only `transform`, `opacity`, `border-radius`, and registered CSS properties
- `will-change: transform, opacity` on animated layers
- No JS state, no requestAnimationFrame, no React re-renders
- `pointer-events: none` on entire container
- `overflow: clip` prevents any layout impact
- `@property` registration enables GPU-accelerated color interpolation
- Mobile: reduced blur radius and smaller field sizes via media query

## Z-Index Stacking

| Layer | z-index |
|-------|---------|
| Ambient liquid root | 0 (fixed) |
| Content (`.ios-app main`) | 1 (relative) |
| Bottom nav | 50 |
| AI bubble | 95 |
| AI panel | 100 |

## Reduced Motion

`@media (prefers-reduced-motion: reduce)` stops all positional movement and shape deformation. A very slow non-moving color fade remains (280–350s per layer). Transform offsets keep glows near corners at reduced-motion rest positions.

## Responsive Behavior

| Viewport | Adjustment |
|----------|-----------|
| Desktop (>640px) | 58vw fields, 55px blur, positioned deep in corners |
| Mobile (≤640px) | 65vw fields, 45px blur, repositioned tighter to corners (top: -18vh, left/right: -20vw) |

## Design Principles

- **Left side = cool** (blue, indigo, emerald family)
- **Right side = warm** (amber, rose family)
- **Strongest glow at corners** — not center
- **Dark center and lower half** — always
- **No rainbow** — two distinct atmospheric regions
- **No white outer halo** — corners are colored, edges are dark
- **Constrained drift** — layers stay within ~4vw of their corner origin
- **Blue and amber remain dominant** — other colors appear as subtle accents

## Known Limitations

- No texture/grain layer (kept clean for performance)
- Body and `.ios-app` retain fallback linear gradients in case component fails to load
- Light mode and dark mode share the same animation (overlay handles contrast)
- `@property` not supported in very old browsers (shows static initial-value colors)
