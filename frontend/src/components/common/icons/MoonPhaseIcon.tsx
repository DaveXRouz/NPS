interface MoonPhaseIconProps {
  /** Numeric phase index 0-7 */
  phase?: number;
  /** Phase name string — mapped to index internally */
  phaseName?: string;
  size?: number | string;
  className?: string;
}

const PHASE_NAME_MAP: Record<string, number> = {
  "New Moon": 0,
  "Waxing Crescent": 1,
  "First Quarter": 2,
  "Waxing Gibbous": 3,
  "Full Moon": 4,
  "Waning Gibbous": 5,
  "Last Quarter": 6,
  "Third Quarter": 6,
  "Waning Crescent": 7,
};

/**
 * SVG moon phase icon. Renders the illuminated portion of the moon
 * based on phase index (0=New through 7=Waning Crescent).
 *
 * Uses a single SVG with a mask to simulate the shadow region.
 */
export function MoonPhaseIcon({
  phase,
  phaseName,
  size = 24,
  className = "",
}: MoonPhaseIconProps) {
  let idx = phase ?? (phaseName ? (PHASE_NAME_MAP[phaseName] ?? 0) : 0);
  idx = Math.max(0, Math.min(7, idx));

  const r = 10; // moon radius
  const cx = 12; // center
  const cy = 12;

  // Compute the mask ellipse rx to carve out the shadow.
  // Phase 0 (new): fully shadowed. Phase 4 (full): no shadow.
  // For waxing phases (1-3), shadow comes from the left.
  // For waning phases (5-7), shadow comes from the right.

  let maskPath: string;

  if (idx === 0) {
    // New moon: full shadow — just show an outline
    maskPath = "";
  } else if (idx === 4) {
    // Full moon: fully lit
    maskPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  } else {
    // Partial phases: use two arcs to create the lit region
    const top = cy - r;
    const bottom = cy + r;

    // The terminator curve rx (how far the shadow edge bows)
    // Maps phase to how much of the disk is lit
    const phaseProgress = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25][idx];

    // terminatorRx: 0 = straight line, r = full bulge
    const terminatorRx = Math.abs(2 * phaseProgress - 1) * r;
    const terminatorSweep = phaseProgress > 0.5 ? 1 : 0;

    if (idx <= 3) {
      // Waxing: right side is lit
      // Right arc (always a semicircle)
      const rightArc = `A ${r} ${r} 0 0 1 ${cx} ${bottom}`;
      // Terminator arc (left edge of lit area)
      const terminatorArc = `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${top}`;
      maskPath = `M ${cx} ${top} ${rightArc} ${terminatorArc} Z`;
    } else {
      // Waning: left side is lit
      const leftArc = `A ${r} ${r} 0 0 0 ${cx} ${bottom}`;
      const terminatorArc = `A ${terminatorRx} ${r} 0 0 ${1 - terminatorSweep} ${cx} ${top}`;
      maskPath = `M ${cx} ${top} ${leftArc} ${terminatorArc} Z`;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Moon outline */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
        opacity={0.3}
      />
      {/* Illuminated portion */}
      {maskPath && <path d={maskPath} fill="currentColor" opacity={0.85} />}
    </svg>
  );
}
