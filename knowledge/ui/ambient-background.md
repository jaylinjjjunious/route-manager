# Ambient Liquid Background System

**Created:** 2026-07-21
**Last Updated:** 2026-07-21
**Component:** `src/components/backgrounds/AmbientLiquidBackground.tsx`
**CSS:** `src/index.css` (ambient orb section)

---

## Purpose

One liquid-light orb drifting organically through a space-black background. The orb floats across the upper and middle regions on a long, non-repeating path while cycling through the full product palette. Deep space-black base always visible.

## Composition

```
         space-black background
              [orb drifts]
         space-black lower page
```

## Architecture

The component renders two elements inside a fixed, full-viewport container:

| Element | Purpose | Animation |
|---------|---------|-----------|
| `.ambient-orb` | Single color field | 140s motion path + 90s color cycle |
| `.ambient-vignette` | Dark edges and bottom | Static |

## Orb Properties

| Property | Value |
|----------|-------|
| Size | 80vw × 48vh (desktop), 95vw × 42vh (mobile) |
| Blur | 52px (desktop), 44px (mobile) |
| Initial position | `top: 14vh; left: 50%` |
| Opacity | 1.0 (varies 0.92–1.0 during path) |
| Gradient | `radial-gradient(ellipse 78% 100% at 50% 50%, ...)` |

## Motion Path

140-second loop with 10 waypoints at irregular intervals:

| % | X | Y | Scale | Notes |
|---|---|---|-------|-------|
| 0% | 0vw | 0vh | 1.0 | Start (upper-center) |
| 9% | +14vw | -4vh | 1.07 | Upper-right drift |
| 19% | -12vw | +6vh | 0.94 | Left-down diagonal |
| 31% | +8vw | -8vh | 1.12 | High center hover |
| 43% | -16vw | +2vh | 0.96 | Far left sweep |
| 56% | +18vw | -2vh | 1.08 | Far right sweep |
| 68% | -8vw | +8vh | 0.93 | Lower-left hover |
| 79% | +10vw | -6vh | 1.10 | Upper-right return |
| 90% | -14vw | +4vh | 0.97 | Left mid-drift |
| 100% | 0vw | 0vh | 1.0 | Seamless loop |

Y stays within 8vh–52vh to keep lower page dark. X spans ±18vw. Scale 0.93–1.12. Rotation ±1.5deg. Border-radius deforms at each waypoint.

## Color Palette — 8-Phase Full Rotation

90 seconds total. Each phase ~11s.

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

## Token Architecture

Two CSS custom properties control the gradient:

```css
@property --amb-in   /* Inner color */
@property --amb-out  /* Outer color */
```

Registered with `syntax: '<color>'` for CSS animation support.

## Animation Strategy

Two independent animations on the single orb element:

1. **Motion** — `ambient-orb-path` (140s, `cubic-bezier(0.37, 0, 0.63, 1)`, `infinite`)
   - `transform`: translate, scale, rotate
   - `border-radius`: organic shape deformation
   - `opacity`: subtle breathing

2. **Color shift** — `ambient-orb-color` (90s, `ease-in-out`, `infinite`)
   - `@property` registered `--amb-in` and `--amb-out`
   - 8 palette stops

## Space-Black Base

- Body dark: `linear-gradient(180deg, #050506 0%, #111113 100%)`
- `.dark .ios-app`: `linear-gradient(180deg, #030305 0%, #0b0b0f 42%, #111113 100%)`
- Ambient root: `position: fixed; z-index: 0`
- Vignette overlay keeps edges and lower page black

## Performance

- Animates only `transform`, `opacity`, `border-radius`, and registered CSS properties
- `will-change: transform, opacity` on orb element
- No JS state, no requestAnimationFrame, no React re-renders
- `pointer-events: none` on entire container
- `overflow: clip` prevents any layout impact
- Single element = minimal DOM overhead

## Z-Index Stacking

| Layer | z-index |
|-------|---------|
| Ambient liquid root | 0 (fixed) |
| Content (`.ios-app main`) | 1 (relative) |
| Bottom nav | 50 |
| AI bubble | 95 |
| AI panel | 100 |

## Reduced Motion

`@media (prefers-reduced-motion: reduce)` stops all movement. Orb stays visible at a centered rest position (`translate(0, 2vh) scale(1.04) opacity: 0.92`). Color cycle continues at 360s.

## Responsive Behavior

| Viewport | Adjustment |
|----------|-----------|
| Desktop (>640px) | 80vw × 48vh, 52px blur |
| Mobile (≤640px) | 95vw × 42vh, 44px blur, top: 10vh |

## Design Principles

- **One orb** — single atmospheric element, not multiple layers
- **Organic path** — 10 irregular waypoints prevent obvious loop
- **Space-black always visible** — edges, lower page, between panels
- **Full palette rotation** — 8 recognizable color families
- **Long cycle** — 140s motion prevents repetition recognition
- **Behind everything** — z-index 0, pointer-events none

## Known Limitations

- `@property` not supported in very old browsers (shows static initial-value colors)
- Body and `.ios-app` retain fallback linear gradients
- Motion path is fixed in CSS — no randomization per session
