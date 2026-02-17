import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NumberHeartbeatProps {
  resolved: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "w-8 h-8 text-sm",
  md: "w-12 h-12 text-lg",
  lg: "w-16 h-16 text-2xl",
} as const;

export function NumberHeartbeat({
  resolved,
  size = "md",
  className = "",
}: NumberHeartbeatProps) {
  const reduced = useReducedMotion();

  const sizeClass = SIZES[size];
  const animClass = reduced
    ? ""
    : resolved
      ? "nps-animate-scale-in"
      : "nps-animate-heartbeat";

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] text-[var(--nps-accent)] ${animClass} ${className}`}
      aria-hidden="true"
    >
      {resolved ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span className="opacity-60">?</span>
      )}
    </div>
  );
}
