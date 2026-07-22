/**
 * AmbientLiquidBackground
 *
 * Single liquid-light orb floating through a space-black background
 * for All in One 667. The orb drifts organically across the upper and
 * middle regions while cycling through the full product palette.
 * Pure CSS — no JS state, no canvas, no heavy dependencies.
 */
export default function AmbientLiquidBackground() {
  return (
    <div className="ambient-root" aria-hidden="true">
      <div className="ambient-orb" />
      <div className="ambient-vignette" />
    </div>
  );
}
