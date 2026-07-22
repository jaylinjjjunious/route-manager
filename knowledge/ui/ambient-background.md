# Ambient Liquid Background System

**Created:** 2026-07-21
**Last Updated:** 2026-07-21
**Component:** `src/components/backgrounds/AmbientLiquidBackground.tsx`
**CSS:** `src/index.css` (ambient-liquid-* section)
**Replaces:** `.ios-page-glow` static gradient div

---

## Purpose

Provides a slow, liquid-light animated background behind all authenticated application pages. The effect creates an atmospheric sense of depth with moving glow fields that cycle through the full product color palette, while keeping content readable and interactions unimpeded.

## Architecture

The component renders five absolutely-positioned layers inside a fixed, full-viewport container:

| Layer | Position | Color Cycle | Duration |
|-------|----------|-------------|----------|
| `ambient-blue-primary` | Upper-left | Blue → Indigo → Emerald → Blue-deep | 140s color / 28s drift |
| `ambient-blue-secondary` | Upper-left offset | iOS Blue → Emerald-deep → Blue → Indigo | 160s color / 36s drift |
| `ambient-amber-primary` | Upper-right | Amber → Rose → Amber-warm | 150s color / 32s drift |
| `ambient-amber-secondary` | Upper-right offset | Amber-warm → Rose-muted → Amber | 130s color / 40s drift |
| `ambient-dark-overlay` | Full viewport | Dark gradient (static) | None |

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

### Colors Excluded

| Family | Reason |
|--------|--------|
| Violet | Not used in product palette |
| Purple | Not used in product palette |
| Teal | Not used in product palette |
| Cyan | Not used in product palette |
| Orange | Amber is the warm tone; orange would muddy |
| Lime | Only used for one battery icon, not a design family |
| Red | Too alarming; rose serves this role at lower saturation |
| Gray/Slate | Neutral, not suitable for ambient atmosphere |

## Animation Strategy

Two independent animation systems run simultaneously on each layer:

1. **Motion** — `ambient-drift-*` keyframes (28–40s, `alternate`)
   - `transform`: translate, scale, rotate
   - `border-radius`: organic shape deformation
   - `opacity`: subtle breathing

2. **Color shift** — `ambient-shift-*` keyframes (130–160s, `infinite`)
   - `@property` registered custom properties (`--amb-color-1` through `--amb-color-4b`)
   - Animated through palette stops at smooth intervals
   - Different durations per layer prevent synchronized color changes

### Layer Color Cycles

**Layer 1 (140s):** Blue → Indigo → Emerald → Blue-deep → Blue
**Layer 2 (160s):** iOS Blue → Emerald-deep → Blue → Indigo → iOS Blue
**Layer 3 (150s):** Amber → Rose → Amber-warm → Amber
**Layer 4 (130s):** Amber-warm → Rose-muted → Amber → Amber-warm

### Full Cycle Duration

The LCM of 140, 160, 150, 130 = very long (hundreds of minutes). The visual effect is that the palette never visibly repeats.

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
- Mobile: reduced blur radius via media query

## Z-Index Stacking

| Layer | z-index |
|-------|---------|
| Ambient liquid root | 0 (fixed) |
| Content (`.ios-app main`) | 1 (relative) |
| Bottom nav | 50 |
| AI bubble | 95 |
| AI panel | 100 |

## Reduced Motion

`@media (prefers-reduced-motion: reduce)` stops all positional movement and shape deformation. A very slow non-moving color fade remains (300–350s duration). The background still shows atmospheric color but without drift.

## Responsive Behavior

| Viewport | Adjustment |
|----------|-----------|
| Desktop (>640px) | Full-size layers, 55–85px blur |
| Mobile (≤640px) | Layers widen to 60–80vw, blur reduced to 45–65px |

## Design Principles

- **Left side = cool** (blue, indigo, emerald family)
- **Right side = warm** (amber, rose family)
- **No rainbow** — two distinct atmospheric regions
- **No saturated fills** — all colors at 16–30% opacity
- **Dark overlay** always present for readability
- **Blue and amber remain dominant** — other colors appear as subtle accents

## Known Limitations

- No texture/grain layer (kept clean for performance)
- Body and `.ios-app` retain fallback linear gradients in case component fails to load
- Light mode and dark mode share the same animation (overlay handles contrast)
- `@property` not supported in very old browsers (shows static initial-value colors)
