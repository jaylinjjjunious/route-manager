/**
 * AmbientLiquidBackground
 *
 * Three liquid-light orbs floating through a space-black background
 * for All in One 667. Each orb drifts organically through independent
 * paths, timing, and color cycles. Pure CSS — no JS state, no canvas.
 *
 * Orb 1: upper/middle zones, base size, 140s path / 90s color
 * Orb 2: middle/lower zones, smaller, 115s path / 75s color
 * Orb 3: wide roaming, larger, 165s path / 110s color
 */
const ORBS = [
  { className: 'ambient-orb ambient-orb--1' },
  { className: 'ambient-orb ambient-orb--2' },
  { className: 'ambient-orb ambient-orb--3' },
] as const;

export default function AmbientLiquidBackground() {
  return (
    <div className="ambient-root" aria-hidden="true">
      {ORBS.map((orb) => (
        <div key={orb.className} className={orb.className} />
      ))}
      <div className="ambient-vignette" />
    </div>
  );
}
