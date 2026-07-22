/**
 * AmbientLiquidBackground
 *
 * Original animated liquid-light background for All in One 667.
 * Renders slow-moving blue and amber radial glow fields behind all content.
 * Pure CSS animation — no JS state, no canvas, no heavy dependencies.
 */
export default function AmbientLiquidBackground() {
  return (
    <div className="ambient-liquid-root" aria-hidden="true">
      {/* Blue primary — upper left */}
      <div className="ambient-layer ambient-blue-primary" />
      {/* Blue secondary — slightly offset for depth */}
      <div className="ambient-layer ambient-blue-secondary" />
      {/* Amber primary — upper right */}
      <div className="ambient-layer ambient-amber-primary" />
      {/* Amber secondary — offset for depth */}
      <div className="ambient-layer ambient-amber-secondary" />
      {/* Dark center/lower readability overlay */}
      <div className="ambient-layer ambient-dark-overlay" />
    </div>
  );
}
