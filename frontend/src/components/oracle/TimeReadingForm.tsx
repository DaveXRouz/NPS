import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { FrameworkReadingResponse } from "@/types";
import { useSubmitTimeReading } from "@/hooks/useOracleReadings";
import { useReadingProgress } from "@/hooks/useReadingProgress";

interface TimeReadingFormProps {
  userId: number;
  userName: string;
  onResult: (result: FrameworkReadingResponse) => void;
  onProgress?: (progress: {
    step: string;
    progress: number;
    message: string;
  }) => void;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function TimeReadingForm({
  userId,
  userName,
  onResult,
  onProgress,
}: TimeReadingFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "fa";
  const now = new Date();

  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());
  const [second, setSecond] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mutation = useSubmitTimeReading();
  const readingProgress = useReadingProgress();

  // Forward progress events to parent
  useEffect(() => {
    if (readingProgress.isActive && onProgress) {
      onProgress({
        step: readingProgress.step,
        progress: readingProgress.progress,
        message: readingProgress.message,
      });
    }
  }, [
    readingProgress.isActive,
    readingProgress.step,
    readingProgress.progress,
    readingProgress.message,
    onProgress,
  ]);

  const handleUseCurrentTime = useCallback(() => {
    const d = new Date();
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setSecond(d.getSeconds());
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const signValue = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
      mutation.mutate(
        {
          user_id: userId,
          reading_type: "time",
          sign_value: signValue,
          locale: i18n.language === "fa" ? "fa" : "en",
          numerology_system: "auto",
        },
        {
          onSuccess: (data) => {
            onResult(data);
          },
          onError: (err) => {
            const msg =
              err instanceof Error ? err.message : t("oracle.error_submit");
            setError(msg);
          },
        },
      );
    },
    [hour, minute, second, userId, i18n.language, mutation, onResult, t],
  );

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteSecondOptions = Array.from({ length: 60 }, (_, i) => i);

  const selectClasses =
    "bg-[var(--nps-bg-input)] border border-[var(--nps-glass-border)] rounded-lg px-4 py-3 text-sm text-[var(--nps-text)] nps-input-focus transition-all duration-200 min-w-[72px] min-h-[44px]";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 text-start nps-animate-fade-in"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="text-sm text-[var(--nps-text-dim)]">
        {t("oracle.consulting_for", { name: userName })}
      </div>

      <h3 className="text-lg font-semibold text-[var(--nps-text-bright)]">
        {t("oracle.time_reading_title")}
      </h3>

      {/* Time selectors */}
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4">
        <div className="flex items-center gap-3 justify-center">
          <div className="flex flex-col">
            <label
              htmlFor="hour-select"
              className="text-xs text-[var(--nps-text-dim)] mb-1.5 text-center"
            >
              {t("oracle.hour_label")}
            </label>
            <select
              id="hour-select"
              aria-label={t("oracle.hour_label")}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className={selectClasses}
              disabled={mutation.isPending}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {pad2(h)}
                </option>
              ))}
            </select>
          </div>

          <span className="mt-5 text-xl font-bold text-[var(--nps-accent)] opacity-60">
            :
          </span>

          <div className="flex flex-col">
            <label
              htmlFor="minute-select"
              className="text-xs text-[var(--nps-text-dim)] mb-1.5 text-center"
            >
              {t("oracle.minute_label")}
            </label>
            <select
              id="minute-select"
              aria-label={t("oracle.minute_label")}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className={selectClasses}
              disabled={mutation.isPending}
            >
              {minuteSecondOptions.map((m) => (
                <option key={m} value={m}>
                  {pad2(m)}
                </option>
              ))}
            </select>
          </div>

          <span className="mt-5 text-xl font-bold text-[var(--nps-accent)] opacity-60">
            :
          </span>

          <div className="flex flex-col">
            <label
              htmlFor="second-select"
              className="text-xs text-[var(--nps-text-dim)] mb-1.5 text-center"
            >
              {t("oracle.second_label")}
            </label>
            <select
              id="second-select"
              aria-label={t("oracle.second_label")}
              value={second}
              onChange={(e) => setSecond(Number(e.target.value))}
              className={selectClasses}
              disabled={mutation.isPending}
            >
              {minuteSecondOptions.map((s) => (
                <option key={s} value={s}>
                  {pad2(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Use current time button */}
      <button
        type="button"
        onClick={handleUseCurrentTime}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--nps-accent)]/10 text-[var(--nps-accent)] border border-[var(--nps-accent)]/20 hover:bg-[var(--nps-accent)]/20 transition-colors text-xs"
        disabled={mutation.isPending}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {t("oracle.use_current_time")}
      </button>

      {/* Progress indicator */}
      {mutation.isPending && readingProgress.isActive && (
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3 text-sm text-[var(--nps-accent)]">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--nps-accent)] border-t-transparent" />
            <span>{readingProgress.message}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--nps-border)]">
            <div
              className="h-1.5 rounded-full bg-[var(--nps-accent)] transition-all duration-300"
              style={{ width: `${readingProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      <div aria-live="polite">
        {error && (
          <p
            className="text-xs text-nps-error"
            role="alert"
            data-testid="time-error"
          >
            {error}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
        className="w-full rounded-lg bg-gradient-to-r from-[var(--nps-accent)] to-[var(--nps-accent-hover)] px-4 py-3 text-[var(--nps-bg)] font-medium nps-btn-lift disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
      >
        {mutation.isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--nps-bg)] border-t-transparent" />
        )}
        {mutation.isPending
          ? t("oracle.generating_reading")
          : t("oracle.submit_reading")}
      </button>
    </form>
  );
}
