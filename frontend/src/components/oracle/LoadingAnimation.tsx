import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface LoadingAnimationProps {
  step: number;
  total: number;
  message: string;
  onCancel?: () => void;
}

export function LoadingAnimation({
  step,
  total,
  message,
  onCancel,
}: LoadingAnimationProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const progressPct = total > 0 ? (step / total) * 100 : 0;

  // Typewriter effect state
  const [displayedChars, setDisplayedChars] = useState(0);
  const prevMessageRef = useRef(message);

  useEffect(() => {
    if (message !== prevMessageRef.current) {
      setDisplayedChars(0);
      prevMessageRef.current = message;
    }
  }, [message]);

  useEffect(() => {
    if (reduced || displayedChars >= message.length) return;
    const timer = setTimeout(() => setDisplayedChars((c) => c + 1), 30);
    return () => clearTimeout(timer);
  }, [displayedChars, message, reduced]);

  return (
    <div
      className="flex flex-col items-center justify-center py-12"
      aria-live="polite"
      data-testid="loading-animation"
    >
      {/* Concentric orbital rings */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 128 128"
          fill="none"
          aria-hidden="true"
        >
          {/* Outer ring */}
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="var(--nps-stat-readings)"
            strokeWidth="0.5"
            opacity="0.3"
            className={reduced ? "" : "origin-center"}
            style={
              reduced
                ? undefined
                : {
                    animation: "spin 12s linear infinite",
                  }
            }
          />
          {/* Middle ring — counter-rotation */}
          <circle
            cx="64"
            cy="64"
            r="42"
            stroke="var(--nps-accent)"
            strokeWidth="0.75"
            opacity="0.4"
            strokeDasharray="4 8"
            className={reduced ? "" : "origin-center"}
            style={
              reduced
                ? undefined
                : {
                    animation: "spin 8s linear infinite reverse",
                  }
            }
          />
          {/* Inner ring */}
          <circle
            cx="64"
            cy="64"
            r="26"
            stroke="var(--nps-stat-streak)"
            strokeWidth="0.5"
            opacity="0.5"
            className={reduced ? "" : "origin-center"}
            style={
              reduced
                ? undefined
                : {
                    animation: "spin 16s linear infinite",
                  }
            }
          />
          {/* Core glow dot */}
          <circle
            cx="64"
            cy="64"
            r="4"
            fill="var(--nps-accent)"
            className={reduced ? "" : "nps-animate-orb-pulse"}
          />
        </svg>
      </div>

      {/* Typewriter message */}
      <p className="text-sm text-[var(--nps-text)] flex items-center gap-0.5">
        <span className="overflow-hidden whitespace-nowrap">
          {reduced ? message : message.slice(0, displayedChars)}
        </span>
        <span
          className="inline-block w-[2px] h-4 bg-[var(--nps-accent)] nps-animate-cursor-blink"
          aria-hidden="true"
        />
      </p>

      {/* Progress track with shimmer */}
      <div className="w-56 h-[2px] bg-[var(--nps-border)] rounded-full mx-auto mt-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out nps-animate-glimmer"
          style={{
            width: `${progressPct}%`,
            background:
              "linear-gradient(90deg, var(--nps-accent), var(--nps-stat-readings))",
          }}
          data-testid="progress-bar"
        />
      </div>

      {/* Step dots */}
      {total > 0 && (
        <div className="flex items-center gap-2 mt-4">
          {Array.from({ length: total }).map((_, i) => {
            const isPast = i < step;
            const isCurrent = i === step;
            return (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  isPast
                    ? "w-2 h-2 bg-[var(--nps-accent)]"
                    : isCurrent
                      ? "w-3 h-3 bg-[var(--nps-accent)] shadow-[0_0_6px_var(--nps-accent)]"
                      : "w-2 h-2 bg-[var(--nps-border)]"
                }`}
                aria-hidden="true"
              />
            );
          })}
          <span className="text-xs text-[var(--nps-text-dim)] ms-2">
            {t("oracle.progress_step", { step, total })}
          </span>
        </div>
      )}

      {/* Cancel button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 text-xs text-[var(--nps-text-dim)] hover:text-[var(--nps-accent)] transition-colors"
          data-testid="cancel-button"
        >
          {t("oracle.loading_cancel")}
        </button>
      )}

      {/* Inline keyframe for spin (avoids adding to global CSS) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
