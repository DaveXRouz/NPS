import React from "react";
import { CountUp } from "./common/CountUp";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  accentColor?: string;
  icon?: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  delay?: number;
}

const TREND_STYLES = {
  up: "text-nps-success",
  down: "text-nps-error",
  flat: "text-nps-text-dim",
} as const;

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

function parseNumericValue(value: string | number): {
  numeric: number | null;
  suffix: string;
  prefix: string;
} {
  if (typeof value === "number") {
    return { numeric: value, suffix: "", prefix: "" };
  }
  const match = value.match(/^([^0-9]*?)(\d+(?:\.\d+)?)(.*)$/);
  if (match) {
    return {
      prefix: match[1],
      numeric: parseFloat(match[2]),
      suffix: match[3],
    };
  }
  return { numeric: null, suffix: "", prefix: "" };
}

export const StatsCard = React.memo(function StatsCard({
  label,
  value,
  subtitle,
  color,
  accentColor,
  icon,
  trend,
  delay = 0,
}: StatsCardProps) {
  const parsed = parseNumericValue(value);
  const effectiveColor = color ?? accentColor;

  return (
    <div
      role="group"
      aria-label={label}
      className="group bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 min-h-[72px] nps-card-hover"
      style={
        accentColor
          ? {
              borderInlineStartWidth: "2px",
              borderInlineStartColor: accentColor,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        {icon && accentColor ? (
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-shadow duration-300 group-hover:shadow-[0_0_8px_var(--accent-glow)]"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
              ["--accent-glow" as string]: accentColor,
            }}
          >
            <span className="w-4 h-4" style={{ color: accentColor }}>
              {icon}
            </span>
          </span>
        ) : icon ? (
          <span className="w-4 h-4 text-nps-text-dim">{icon}</span>
        ) : null}
        <p className="text-xs text-nps-text-dim uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p
        className="text-xl sm:text-2xl font-bold mt-1 text-[var(--nps-text-bright)]"
        style={{
          fontFamily: "var(--nps-font-mono)",
          ...(effectiveColor ? { color: effectiveColor } : {}),
        }}
      >
        {parsed.numeric !== null ? (
          <CountUp
            value={parsed.numeric}
            duration={800}
            delay={delay}
            prefix={parsed.prefix}
            suffix={parsed.suffix}
            decimals={String(value).includes(".") ? 1 : 0}
            startOnView
          />
        ) : (
          value
        )}
      </p>
      {trend && (
        <p
          className={`text-xs mt-1 flex items-center gap-1 ${TREND_STYLES[trend.direction]}`}
        >
          {React.createElement(TREND_ICONS[trend.direction], {
            className: "w-3 h-3",
          })}{" "}
          {trend.value}
        </p>
      )}
      {subtitle && <p className="text-xs text-nps-text-dim mt-1">{subtitle}</p>}
    </div>
  );
});
