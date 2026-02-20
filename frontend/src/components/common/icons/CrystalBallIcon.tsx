interface CrystalBallIconProps {
  size?: number | string;
  className?: string;
}

/**
 * SVG crystal ball icon — premium design with radial gradient fill and highlights.
 * Used for readings empty state and oracle branding.
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
      <defs>
        {/* Radial gradient for the sphere */}
        <radialGradient id="crystal-ball-gradient" cx="0.4" cy="0.35" r="0.65">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
          <stop offset="50%" stopColor="currentColor" stopOpacity={0.12} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0.04} />
        </radialGradient>
        {/* Highlight gradient for the specular shine */}
        <radialGradient id="crystal-highlight" cx="0.35" cy="0.3" r="0.35">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.5} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Sphere fill */}
      <circle cx={12} cy={10} r={7.5} fill="url(#crystal-ball-gradient)" />
      {/* Sphere outline */}
      <circle
        cx={12}
        cy={10}
        r={8}
        stroke="currentColor"
        strokeWidth={1}
        strokeOpacity={0.4}
        fill="none"
      />
      {/* Inner specular highlight */}
      <ellipse cx={9.5} cy={7} rx={3} ry={2.5} fill="url(#crystal-highlight)" />
      {/* Small sparkle dots inside */}
      <circle cx={9} cy={7} r={0.7} fill="currentColor" opacity={0.6} />
      <circle cx={14.5} cy={11.5} r={0.5} fill="currentColor" opacity={0.35} />
      <circle cx={10.5} cy={13} r={0.4} fill="currentColor" opacity={0.25} />
      <circle cx={13} cy={8} r={0.35} fill="currentColor" opacity={0.2} />
      {/* Curved base with slight fill */}
      <path
        d="M8 18 C8 16.8 9.2 16 12 16 C14.8 16 16 16.8 16 18"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity={0.06}
      />
      <line
        x1={7}
        y1={18}
        x2={17}
        y2={18}
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}
