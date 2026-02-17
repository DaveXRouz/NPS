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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 text-start"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="text-sm text-nps-text-dim">
        {t("oracle.consulting_for", { name: userName })}
      </div>

      <h3 className="text-lg font-semibold">
        {t("oracle.time_reading_title")}
      </h3>

      {/* Time selectors */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <label
            htmlFor="hour-select"
            className="text-xs text-nps-text-dim mb-1"
          >
            {t("oracle.hour_label")}
          </label>
          <select
            id="hour-select"
            aria-label={t("oracle.hour_label")}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
            disabled={mutation.isPending}
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {pad2(h)}
              </option>
            ))}
          </select>
        </div>

        <span className="mt-5 text-lg font-bold">:</span>

        <div className="flex flex-col">
          <label
            htmlFor="minute-select"
            className="text-nps-text-dim text-xs mb-1"
          >
            {t("oracle.minute_label")}
          </label>
          <select
            id="minute-select"
            aria-label={t("oracle.minute_label")}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
            disabled={mutation.isPending}
          >
            {minuteSecondOptions.map((m) => (
              <option key={m} value={m}>
                {pad2(m)}
              </option>
            ))}
          </select>
        </div>

        <span className="mt-5 text-lg font-bold">:</span>

        <div className="flex flex-col">
          <label
            htmlFor="second-select"
            className="text-nps-text-dim text-xs mb-1"
          >
            {t("oracle.second_label")}
          </label>
          <select
            id="second-select"
            aria-label={t("oracle.second_label")}
            value={second}
            onChange={(e) => setSecond(Number(e.target.value))}
            className="bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
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

      {/* Use current time button */}
      <button
        type="button"
        onClick={handleUseCurrentTime}
        className="text-sm text-nps-oracle-accent hover:text-nps-oracle-accent/80 transition-colors"
        disabled={mutation.isPending}
      >
        {t("oracle.use_current_time")}
      </button>

      {/* Progress indicator */}
      {mutation.isPending && readingProgress.isActive && (
        <div className="bg-nps-oracle-bg border border-nps-oracle-border rounded p-3 text-sm text-nps-oracle-accent">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-nps-oracle-accent border-t-transparent" />
            <span>{readingProgress.message}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-nps-border">
            <div
              className="h-1.5 rounded-full bg-nps-oracle-accent transition-all"
              style={{ width: `${readingProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      <div aria-live="polite">
        {error && (
          <p
            className="text-xs text-nps-bg-danger"
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
        className="w-full rounded bg-[var(--nps-accent)] px-4 py-2 text-[var(--nps-bg)] font-medium hover:bg-[var(--nps-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending
          ? t("oracle.generating_reading")
          : t("oracle.submit_reading")}
      </button>
    </form>
  );
}
