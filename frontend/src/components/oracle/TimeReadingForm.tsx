import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { FrameworkReadingResponse, ReadingProgressEvent } from "@/types";
import { useSubmitTimeReading } from "@/hooks/useOracleReadings";

interface TimeReadingFormProps {
  userId: number;
  userName: string;
  onResult: (result: FrameworkReadingResponse) => void;
  onProgress?: (event: ReadingProgressEvent) => void;
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
  const [progress, setProgress] = useState<ReadingProgressEvent | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const mutation = useSubmitTimeReading();

  // WebSocket for progress updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/oracle/ws`;
    try {
      ws.current = new WebSocket(wsUrl);
      ws.current.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data) as ReadingProgressEvent;
        if (data.reading_type === "time") {
          setProgress(data);
          onProgress?.(data);
        }
      };
    } catch {
      // WebSocket not available in test/dev — ignore
    }
    return () => {
      ws.current?.close();
    };
  }, [onProgress]);

  const handleUseCurrentTime = useCallback(() => {
    const d = new Date();
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setSecond(d.getSeconds());
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setProgress(null);
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
            setProgress(null);
            onResult(data);
          },
        },
      );
    },
    [hour, minute, second, userId, i18n.language, mutation, onResult],
  );

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteSecondOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 text-start"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="text-sm text-gray-500">
        {t("oracle.consulting_for", { name: userName })}
      </div>

      <h3 className="text-lg font-semibold">
        {t("oracle.time_reading_title")}
      </h3>

      {/* Time selectors */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <label htmlFor="hour-select" className="text-xs text-gray-500 mb-1">
            {t("oracle.hour_label")}
          </label>
          <select
            id="hour-select"
            aria-label={t("oracle.hour_label")}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
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
          <label htmlFor="minute-select" className="text-xs text-gray-500 mb-1">
            {t("oracle.minute_label")}
          </label>
          <select
            id="minute-select"
            aria-label={t("oracle.minute_label")}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
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
          <label htmlFor="second-select" className="text-xs text-gray-500 mb-1">
            {t("oracle.second_label")}
          </label>
          <select
            id="second-select"
            aria-label={t("oracle.second_label")}
            value={second}
            onChange={(e) => setSecond(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
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
        className="text-sm text-blue-600 hover:text-blue-800 underline"
        disabled={mutation.isPending}
      >
        {t("oracle.use_current_time")}
      </button>

      {/* Progress indicator */}
      {mutation.isPending && progress && (
        <div className="rounded bg-blue-50 p-3 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>{progress.message}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-blue-200">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all"
              style={{
                width: `${(progress.step / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending
          ? t("oracle.generating_reading")
          : t("oracle.submit_reading")}
      </button>
    </form>
  );
}
