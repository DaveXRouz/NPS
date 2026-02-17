import { useEffect, useRef, useState } from "react";

interface CompatibilityMeterProps {
  score: number; // 0-100
  label?: string;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  animated?: boolean;
}

function getColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getClassification(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Challenging";
}

export default function CompatibilityMeter({
  score,
  label,
  size = "md",
  showPercentage = true,
  animated = true,
}: CompatibilityMeterProps) {
  const [width, setWidth] = useState(animated ? 0 : score);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (animated) {
      requestAnimationFrame(() => {
        setWidth(score);
      });
    }
  }, [score, animated]);

  const barHeight = size === "sm" ? "h-2" : size === "lg" ? "h-6" : "h-4";
  const textSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm";

  if (size === "lg") {
    // Circular gauge for large size
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (width / 100) * circumference;
    const strokeColor =
      score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";

    return (
      <div className="flex flex-col items-center gap-2">
        {label && (
          <span className="text-sm font-medium text-nps-text-dim">{label}</span>
        )}
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#1f1f1f"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={strokeColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={animated ? "transition-all duration-700 ease-out" : ""}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            {showPercentage && (
              <span className="text-xl font-bold">{Math.round(score)}%</span>
            )}
            <span className="text-xs text-nps-text-dim">
              {getClassification(score)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Horizontal bar for sm/md
  return (
    <div
      ref={ref}
      className="w-full"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Compatibility score"}
    >
      {label && (
        <div className="flex justify-between mb-1">
          <span className={`${textSize} font-medium text-nps-text`}>
            {label}
          </span>
          {showPercentage && (
            <span className={`${textSize} text-nps-text-dim`}>
              {Math.round(score)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-nps-border rounded-full ${barHeight}`}>
        <div
          className={`${getColor(score)} ${barHeight} rounded-full ${
            animated ? "transition-all duration-700 ease-out" : ""
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      {!label && showPercentage && (
        <div className="flex justify-between mt-1">
          <span className={`${textSize} text-nps-text-dim`}>
            {getClassification(score)}
          </span>
          <span className={`${textSize} text-nps-text-dim`}>
            {Math.round(score)}%
          </span>
        </div>
      )}
    </div>
  );
}
