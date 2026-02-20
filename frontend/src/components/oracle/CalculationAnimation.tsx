import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LoadingAnimation } from "./LoadingAnimation";
import { CalculationStep } from "./CalculationStep";
import { getCalculationSteps, getActiveStepIndex } from "./calculationSteps";
import type { ReadingType } from "./ReadingTypeSelector";

/** Simulation sequence: advance through these steps on a timer when no WebSocket events arrive. */
const SIM_SEQUENCE = [
  { backendStep: "started", progress: 10 },
  { backendStep: "calculating", progress: 40 },
  { backendStep: "ai_generating", progress: 75 },
] as const;

const SIM_INTERVAL_MS = 3000;

/** Per-step message i18n keys used during simulation. */
const SIM_MESSAGE_KEYS: Record<string, string> = {
  started: "oracle.loading_generating",
  calculating: "oracle.loading_calculating",
  ai_generating: "oracle.loading_ai",
};

interface CalculationAnimationProps {
  readingType: ReadingType;
  step: string;
  progress: number;
  message: string;
  onCancel?: () => void;
}

export function CalculationAnimation({
  readingType,
  step,
  progress,
  message,
  onCancel,
}: CalculationAnimationProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  // --- Client-side progress simulation ---
  const [simIndex, setSimIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasRealData = step !== "";

  useEffect(() => {
    if (hasRealData) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSimIndex((prev) => (prev < SIM_SEQUENCE.length - 1 ? prev + 1 : prev));
    }, SIM_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasRealData]);

  // Reset simulation when component re-mounts (new reading)
  useEffect(() => {
    setSimIndex(0);
  }, [readingType]);

  // Derive effective values: real WebSocket data takes priority over simulation
  const simEntry =
    SIM_SEQUENCE[simIndex] ?? SIM_SEQUENCE[SIM_SEQUENCE.length - 1];
  const effectiveStep = hasRealData ? step : simEntry.backendStep;
  const effectiveProgress = hasRealData ? progress : simEntry.progress;
  const effectiveMessage = hasRealData
    ? message
    : t(SIM_MESSAGE_KEYS[simEntry.backendStep] ?? "oracle.loading_generating");

  const visualSteps = useMemo(
    () => getCalculationSteps(readingType),
    [readingType],
  );

  const activeIndex = useMemo(
    () => getActiveStepIndex(visualSteps, effectiveStep),
    [visualSteps, effectiveStep],
  );

  const allComplete = activeIndex >= visualSteps.length;
  const progressPct = Math.min(Math.max(effectiveProgress, 0), 100);

  // Reduced motion: fall back to the simple LoadingAnimation
  if (reduced) {
    return (
      <LoadingAnimation
        step={effectiveProgress}
        total={100}
        message={effectiveMessage || t("oracle.loading_generating")}
        onCancel={onCancel}
      />
    );
  }

  // Slow trickle during simulation, snappy when real data arrives
  const progressTransition = hasRealData
    ? "transition-all duration-500"
    : "transition-all duration-[3000ms] ease-out";

  return (
    <div
      className={`flex flex-col items-center py-8 ${allComplete ? "nps-animate-celebration" : ""}`}
      aria-live="polite"
      data-testid="calculation-animation"
    >
      {/* Step pipeline */}
      <div className="w-full max-w-sm space-y-0 mb-6">
        {visualSteps.map((vs, i) => {
          const status: "pending" | "active" | "completed" =
            i < activeIndex
              ? "completed"
              : i === activeIndex
                ? "active"
                : "pending";

          return (
            <CalculationStep
              key={vs.id}
              label={t(vs.labelKey)}
              status={status}
              icon={vs.icon}
              isLast={i === visualSteps.length - 1}
              delay={i * 100}
            />
          );
        })}
      </div>

      {/* Progress message */}
      <p className="text-sm text-[var(--nps-text)] transition-opacity duration-300 mb-3">
        {allComplete ? t("oracle.calc_step_complete") : effectiveMessage}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-[var(--nps-border)] rounded-full mx-auto">
        <div
          className={`h-full bg-[var(--nps-accent)] rounded-full ${progressTransition}`}
          style={{ width: `${progressPct}%` }}
          data-testid="progress-bar"
        />
      </div>

      {/* Step counter */}
      <p className="text-xs text-[var(--nps-text-dim)] mt-2">
        {t("oracle.progress_step", {
          step: Math.min(activeIndex + 1, visualSteps.length),
          total: visualSteps.length,
        })}
      </p>

      {/* Cancel button */}
      {onCancel && !allComplete && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-xs text-[var(--nps-text-dim)] hover:text-[var(--nps-accent)] underline transition-colors"
          data-testid="cancel-button"
        >
          {t("oracle.loading_cancel")}
        </button>
      )}
    </div>
  );
}
