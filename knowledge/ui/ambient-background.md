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
| Size | 44vw × 36vh (desktop), 36vw × 28vh (mobile) |
| Blur | 50px (desktop), 40px (mobile) |
| Initial position | `top: 12vh; left: 0` |
| Opacity | 1.0 (varies 0.92–1.0 during path) |
| Gradient | `radial-gradient(ellipse 80% 100% at 50% 50%, ...)` |

## Motion Path — Negative Space Design

140-second loop with 10 waypoints. Path travels through visible background zones around panels:

| % | X | Y | Location | Visibility |
|---|---|---|----------|------------|
| 0% | 4vw | 0vh | Left gutter, upper | Fully visible |
| 9% | 8vw | -6vh | Upper-left open area | Fully visible |
| 19% | 38vw | -2vh | Top center (behind Next Stop top edge) | Partial — blur visible |
| 31% | 82vw | 2vh | Right gutter, upper | Fully visible |
| 43% | 80vw | 22vh | Right gutter, mid | Fully visible |
| 56% | 42vw | 48vh | Gap between panels and stat tiles | Fully visible |
| 68% | 2vw | 32vh | Left gutter, mid | Fully visible |
| 79% | 6vw | 52vh | Left gutter, lower (above nav) | Fully visible |
| 90% | 30vw | 56vh | Lower-center open area | Fully visible |
| 100% | 4vw | 0vh | Return to left gutter | Fully visible |

Desktop layout zones used: left page margin (`px-8`), right page margin, upper area above cards, gap between main panels and stat tiles, lower area above `pb-40` bottom nav clearance.

**7 of 10 waypoints are fully visible.** Waypoint 19% passes partially behind the Next Stop panel's top edge but the blur extends past the panel.

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

`@media (prefers-reduced-motion: reduce)` stops all movement. Orb stays visible in the left gutter at `translate(4vw, 16vh) scale(1.04) opacity: 0.92`. Color cycle continues at 360s.

## Responsive Behavior

| Viewport | Adjustment |
|----------|-----------|
| Desktop (>640px) | 44vw × 36vh orb, 50px blur, path uses page margins and panel gaps |
| Mobile (≤640px) | 36vw × 28vh orb, 40px blur, tighter path through narrow margins and between-card gaps |

Mobile path stays within the `px-3` page margins and vertical card gaps. Reduced-motion places orb at `translate(4vw, 16vh)` — left gutter, fully visible.

## Design Principles

- **One orb** — single atmospheric element
- **Negative space path** — travels through gutters, gaps, and exposed background
- **7/10 waypoints fully visible** — orb is clearly present in open areas
- **Space-black always visible** — edges, lower page, between panels
- **Full palette rotation** — 8 recognizable color families
- **Long cycle** — 140s motion prevents repetition recognition
- **Behind everything** — z-index 0, pointer-events none

## Known Limitations

- `@property` not supported in very old browsers (shows static initial-value colors)
- Body and `.ios-app` retain fallback linear gradients
- Motion path is fixed in CSS — no randomization per session
