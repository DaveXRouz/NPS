import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDailyReading,
  useGenerateDailyReading,
} from "@/hooks/useOracleReadings";
import type { FrameworkReadingResponse, DailyInsights } from "@/types";

interface DailyReadingCardProps {
  userId: number;
  userName: string;
  onViewFull?: (reading: FrameworkReadingResponse) => void;
}

export default function DailyReadingCard({
  userId,
  userName,
  onViewFull,
}: DailyReadingCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "fa";
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    undefined,
  );

  const { data: cached, isLoading } = useDailyReading(userId, selectedDate);
  const generateMutation = useGenerateDailyReading();

  const reading = cached?.reading ?? null;
  const dailyInsights = (
    reading as
      | (FrameworkReadingResponse & { daily_insights?: DailyInsights })
      | null
  )?.daily_insights;

  function handleGenerate() {
    generateMutation.mutate({
      user_id: userId,
      reading_type: "daily",
      date: selectedDate,
      locale: i18n.language,
      numerology_system: "auto",
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        data-testid="daily-loading"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${isRTL ? "rtl" : ""}`}
      data-testid="daily-reading-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t("oracle.daily_reading_title")}
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={selectedDate ?? new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSelectedDate(e.target.value || undefined)}
            aria-label={t("oracle.date_label")}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {t("oracle.consulting_for", { name: userName })}
      </p>

      {/* No reading yet */}
      {!reading && !generateMutation.isPending && (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-4">{t("oracle.no_daily_reading")}</p>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            data-testid="generate-daily-btn"
          >
            {t("oracle.generate_daily")}
          </button>
        </div>
      )}

      {/* Generating */}
      {generateMutation.isPending && (
        <div className="text-center py-6" data-testid="daily-generating">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
          <p className="text-sm text-gray-500">
            {t("oracle.generating_reading")}
          </p>
        </div>
      )}

      {/* Reading loaded */}
      {reading && dailyInsights && (
        <div className="space-y-3" data-testid="daily-insights">
          {/* Energy forecast */}
          <div className="flex items-start gap-2">
            <span className="text-lg">
              {(reading.moon as Record<string, string> | null)?.emoji ?? ""}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t("oracle.daily_energy_forecast")}
              </p>
              <p className="text-sm text-gray-600">
                {dailyInsights.energy_forecast}
              </p>
            </div>
          </div>

          {/* Element of the day */}
          <div>
            <span className="text-sm font-medium text-gray-700">
              {t("oracle.daily_element")}:{" "}
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
              {dailyInsights.element_of_day}
            </span>
          </div>

          {/* Lucky hours */}
          {dailyInsights.lucky_hours.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t("oracle.daily_lucky_hours")}
              </p>
              <p className="text-sm text-gray-600">
                {dailyInsights.lucky_hours.map((h) => `${h}:00`).join(", ")}
              </p>
            </div>
          )}

          {/* Suggested activities */}
          {dailyInsights.suggested_activities.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t("oracle.daily_activities")}
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-1">
                {dailyInsights.suggested_activities.map((activity, i) => (
                  <li key={i}>{activity}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Focus area */}
          {dailyInsights.focus_area && (
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t("oracle.daily_focus")}
              </p>
              <p className="text-sm text-gray-600">
                {dailyInsights.focus_area}
              </p>
            </div>
          )}

          {/* View full reading */}
          {onViewFull && (
            <button
              onClick={() => onViewFull(reading)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {t("oracle.view_full_reading")}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {generateMutation.error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-500 mb-2">
            {t("oracle.error_submit")}
          </p>
          <button
            onClick={handleGenerate}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            {t("oracle.regenerate")}
          </button>
        </div>
      )}
    </div>
  );
}
