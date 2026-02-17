import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Hash,
  Sparkles,
  Layers,
  Type,
  HelpCircle,
  Moon,
  Check,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NumberHeartbeat } from "./NumberHeartbeat";

type StepIcon =
  | "clock"
  | "numerology"
  | "moon"
  | "ai"
  | "combine"
  | "name"
  | "question";

interface CalculationStepProps {
  label: string;
  status: "pending" | "active" | "completed";
  icon: StepIcon;
  isLast: boolean;
  delay: number;
}

const ICON_MAP: Record<StepIcon, LucideIcon> = {
  clock: Clock,
  numerology: Hash,
  moon: Moon,
  ai: Sparkles,
  combine: Layers,
  name: Type,
  question: HelpCircle,
};

export function CalculationStep({
  label,
  status,
  icon,
  isLast,
  delay,
}: CalculationStepProps) {
  const reduced = useReducedMotion();
  const IconComponent = ICON_MAP[icon];

  return (
    <div
      className="flex items-start gap-3"
      style={reduced ? undefined : { animationDelay: `${delay}ms` }}
    >
      {/* Status indicator + connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Circle indicator */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
            status === "completed"
              ? "bg-[var(--nps-accent)]/20 border-[var(--nps-accent)] text-[var(--nps-accent)]"
              : status === "active"
                ? "bg-[var(--nps-accent)]/10 border-[var(--nps-accent)] text-[var(--nps-accent)] shadow-[0_0_12px_var(--nps-glass-glow)]"
                : "bg-[var(--nps-glass-bg)] border-[var(--nps-border)] text-[var(--nps-text-dim)] opacity-40"
          }`}
        >
          {status === "completed" ? (
            <span className={reduced ? "" : "nps-animate-check-in"}>
              <Check size={16} />
            </span>
          ) : status === "active" ? (
            <span className={reduced ? "" : "nps-animate-orb-pulse"}>
              <IconComponent size={16} />
            </span>
          ) : (
            <IconComponent size={16} />
          )}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div
            className={`w-px h-6 transition-colors duration-300 ${
              status === "completed"
                ? "bg-[var(--nps-accent)]/40"
                : "bg-[var(--nps-border)]"
            }`}
            style={
              reduced || status !== "completed"
                ? undefined
                : {
                    animation:
                      "nps-line-grow var(--nps-duration-md) ease-out forwards",
                  }
            }
          />
        )}
      </div>

      {/* Label */}
      <div className="pt-1.5 min-w-0">
        <p
          className={`text-sm transition-colors duration-300 ${
            status === "completed"
              ? "text-[var(--nps-accent)]"
              : status === "active"
                ? "text-[var(--nps-text)] font-medium"
                : "text-[var(--nps-text-dim)] opacity-40"
          }`}
        >
          {label}
        </p>
      </div>

      {/* Number heartbeat (active step only) */}
      <div className="ms-auto flex-shrink-0 pt-0.5">
        {status === "active" && <NumberHeartbeat resolved={false} size="sm" />}
        {status === "completed" && (
          <NumberHeartbeat resolved={true} size="sm" />
        )}
      </div>
    </div>
  );
}
