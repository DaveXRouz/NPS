import { useTranslation } from "react-i18next";

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
  const progressPct = total > 0 ? (step / total) * 100 : 0;

  return (
    <div
      className="flex flex-col items-center justify-center py-12"
      aria-live="polite"
      data-testid="loading-animation"
    >
      {/* Pulsing orb */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-[var(--nps-accent)]/20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-[var(--nps-accent)]/40 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-[var(--nps-accent)] shadow-lg shadow-[var(--nps-accent)]/30" />
      </div>

      {/* Progress message */}
      <p className="text-sm text-[var(--nps-text)] transition-opacity duration-300">
        {message}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-[var(--nps-border)] rounded-full mx-auto mt-4">
        <div
          className="h-full bg-[var(--nps-accent)] rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
          data-testid="progress-bar"
        />
      </div>

      {/* Step counter */}
      {total > 0 && (
        <p className="text-xs text-[var(--nps-text-dim)] mt-2">
          {t("oracle.progress_step", { step, total })}
        </p>
      )}

      {/* Cancel button */}
      {onCancel && (
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
