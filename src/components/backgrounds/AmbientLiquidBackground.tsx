/**
 * AmbientLiquidBackground
 *
 * Centered liquid-light ambient background for All in One 667.
 * Deep space-black base. Color atmosphere concentrated through the
 * middle. Six animated layers cycling through the full product palette.
 * Pure CSS — no JS state, no canvas, no heavy dependencies.
 */
export default function AmbientLiquidBackground() {
  return (
    <div className="ambient-root" aria-hidden="true">
      {/* Primary color field — wide, centered, strongest */}
      <div className="ambient-layer ambient-layer-primary" />
      {/* Supporting color field — medium, offset left */}
      <div className="ambient-layer ambient-layer-support-a" />
      {/* Supporting color field — smaller, offset right */}
      <div className="ambient-layer ambient-layer-support-b" />
      {/* Dark overlay — edges, lower page, vignette */}
      <div className="ambient-layer ambient-layer-vignette" />
    </div>
  );
}
