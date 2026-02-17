interface CrystalBallIconProps {
  size?: number | string;
  className?: string;
}

/**
 * SVG crystal ball icon — used for readings empty state.
 * Renders a sphere with a subtle inner glow and a small base.
 */
export function CrystalBallIcon({
  size = 24,
  className = "",
}: CrystalBallIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Sphere */}
      <circle
        cx={12}
        cy={10}
        r={8}
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
      />
      {/* Inner glow highlight */}
      <circle cx={9} cy={7.5} r={2.5} fill="currentColor" opacity={0.15} />
      {/* Sparkle dots inside */}
      <circle cx={10} cy={8} r={0.8} fill="currentColor" opacity={0.4} />
      <circle cx={14} cy={11} r={0.6} fill="currentColor" opacity={0.3} />
      <circle cx={11} cy={13} r={0.5} fill="currentColor" opacity={0.25} />
      {/* Base */}
      <path
        d="M8 18 C8 17 9 16 12 16 C15 16 16 17 16 18"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1={7}
        y1={18}
        x2={17}
        y2={18}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
