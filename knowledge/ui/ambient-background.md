# Ambient Liquid Background System

**Created:** 2026-07-21
**Component:** `src/components/backgrounds/AmbientLiquidBackground.tsx`
**CSS:** `src/index.css` (ambient-liquid-* section)
**Replaces:** `.ios-page-glow` static gradient div

---

## Purpose

Provides a slow, liquid-light animated background behind all authenticated application pages. The effect creates an atmospheric sense of depth with moving blue and amber glow fields, while keeping content readable and interactions unimpeded.

## Architecture

The component renders five absolutely-positioned layers inside a fixed, full-viewport container:

| Layer | Position | Color | Duration |
|-------|----------|-------|----------|
| `ambient-blue-primary` | Upper-left | `rgba(0, 122, 255, 0.18)` | 28s |
| `ambient-blue-secondary` | Upper-left offset | `rgba(10, 132, 255, 0.14)` | 36s |
| `ambient-amber-primary` | Upper-right | `rgba(200, 140, 40, 0.14)` | 32s |
| `ambient-amber-secondary` | Upper-right offset | `rgba(180, 120, 30, 0.10)` | 40s |
| `ambient-dark-overlay` | Full viewport | Dark gradient | None (static) |

## Animation Strategy

- Pure CSS `@keyframes` with `transform`, `scale`, `opacity`, and `border-radius`
- Each layer has a unique duration (28s–40s) to prevent synchronized motion
- `ease-in-out` timing with `alternate` direction for smooth reversals
- Organic border-radius deformation creates amorphous shapes
- Large blurred layers (50–75px blur) ensure no visible blob outlines

## Color Tokens

Derived from existing app palette:

| Token | Light Mode | Dark Mode Context |
|-------|-----------|-------------------|
| Blue primary | `rgba(0, 122, 255, 0.18)` | System blue at 18% opacity |
| Blue secondary | `rgba(10, 132, 255, 0.14)` | iOS blue at 14% opacity |
| Amber primary | `rgba(200, 140, 40, 0.14)` | Warm gold at 14% opacity |
| Amber secondary | `rgba(180, 120, 30, 0.10)` | Burnt amber at 10% opacity |
| Dark overlay | `rgba(3, 3, 5, 0.35–0.7)` | Readability control |

## Performance

- Animates only `transform`, `opacity`, and `border-radius` (compositor-friendly)
- `will-change: transform, opacity` on animated layers
- No JS state, no requestAnimationFrame, no React re-renders
- `pointer-events: none` on entire container
- `overflow: clip` prevents any layout impact
- Mobile: reduced blur radius via media query

## Z-Index stacking

| Layer | z-index |
|-------|---------|
| Ambient liquid root | 0 (fixed) |
| Content (`.ios-app main`) | 1 (relative) |
| Bottom nav | 50 |
| AI bubble | 95 |
| AI panel | 100 |

## Reduced Motion

`@media (prefers-reduced-motion: reduce)` stops all animations and sets static positioned layers with reduced opacity. The background still shows blue and amber glows but without movement.

## Responsive Behavior

| Viewport | Adjustment |
|----------|-----------|
| Desktop (>640px) | Full-size layers, 60–75px blur |
| Mobile (≤640px) | Layers widen to 55–70vw, blur reduced to 50–60px |

## Known Limitations

- No texture/grain layer (kept clean for performance)
- Body and `.ios-app` retain fallback linear gradients in case component fails to load
- Light mode and dark mode share the same animation (overlay handles contrast)
