import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LoadingAnimation } from "./LoadingAnimation";
import { CalculationStep } from "./CalculationStep";
import { getCalculationSteps, getActiveStepIndex } from "./calculationSteps";
import type { ReadingType } from "./ReadingTypeSelector";

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

  const visualSteps = useMemo(
    () => getCalculationSteps(readingType),
    [readingType],
  );

  const activeIndex = useMemo(
    () => getActiveStepIndex(visualSteps, step),
    [visualSteps, step],
  );

  const allComplete = activeIndex >= visualSteps.length;
  const progressPct = Math.min(Math.max(progress, 0), 100);

  // Reduced motion: fall back to the simple LoadingAnimation
  if (reduced) {
    return (
      <LoadingAnimation
        step={progress}
        total={100}
        message={message || t("oracle.loading_generating")}
        onCancel={onCancel}
      />
    );
  }

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
        {allComplete ? t("oracle.calc_step_complete") : message}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-[var(--nps-border)] rounded-full mx-auto">
        <div
          className="h-full bg-[var(--nps-accent)] rounded-full transition-all duration-500"
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
