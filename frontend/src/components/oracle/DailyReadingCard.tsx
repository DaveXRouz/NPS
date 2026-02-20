import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useOracleDailyReading,
  useGenerateDailyReading,
} from "@/hooks/useOracleReadings";
import { MoonPhaseIcon } from "@/components/common/icons";
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

  const { data: cached, isLoading } = useOracleDailyReading(
    userId,
    selectedDate,
  );
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
        className="rounded-xl border border-nps-border bg-nps-bg-card p-6 shadow-sm"
        data-testid="daily-loading"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-nps-bg-hover rounded w-1/3" />
          <div className="h-4 bg-nps-bg-hover rounded w-2/3" />
          <div className="h-4 bg-nps-bg-hover rounded w-1/2" />
          <div className="h-4 bg-nps-bg-hover rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-nps-border bg-nps-bg-card p-6 shadow-sm"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="daily-reading-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-nps-text-bright">
          {t("oracle.daily_reading_title")}
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="text-sm bg-nps-bg-input border border-nps-border rounded px-2 py-1 text-nps-text"
            value={selectedDate ?? new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSelectedDate(e.target.value || undefined)}
            aria-label={t("oracle.date_label")}
          />
        </div>
      </div>

      <p className="text-sm text-nps-text-dim mb-4">
        {t("oracle.consulting_for", { name: userName })}
      </p>

      {/* No reading yet */}
      {!reading && !generateMutation.isPending && (
        <div className="text-center py-6">
          <p className="text-nps-text-dim mb-4">
            {t("oracle.no_daily_reading")}
          </p>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-[var(--nps-accent)] text-[var(--nps-bg)] rounded-lg hover:bg-[var(--nps-accent-hover)] transition-colors"
            data-testid="generate-daily-btn"
          >
            {t("oracle.generate_daily")}
          </button>
        </div>
      )}

      {/* Generating */}
      {generateMutation.isPending && (
        <div className="text-center py-6" data-testid="daily-generating">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-nps-oracle-accent border-t-transparent rounded-full mb-2" />
          <p className="text-sm text-nps-text-dim">
            {t("oracle.generating_reading")}
          </p>
        </div>
      )}

      {/* Reading loaded */}
      {reading && dailyInsights && (
        <div className="space-y-3" data-testid="daily-insights">
          {/* Energy forecast */}
          <div className="flex items-start gap-2">
            <MoonPhaseIcon
              phaseName={
                (reading.moon as Record<string, string> | null)?.phase_name ??
                "New Moon"
              }
              size={24}
              className="text-nps-text flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-nps-text">
                {t("oracle.daily_energy_forecast")}
              </p>
              <p className="text-sm text-nps-text-dim">
                {dailyInsights.energy_forecast}
              </p>
            </div>
          </div>

          {/* Element of the day */}
          <div>
            <span className="text-sm font-medium text-nps-text">
              {t("oracle.daily_element")}:{" "}
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full bg-nps-oracle-accent/20 text-nps-oracle-accent text-xs font-medium">
              {dailyInsights.element_of_day}
            </span>
          </div>

          {/* Lucky hours */}
          {dailyInsights.lucky_hours.length > 0 && (
            <div>
              <p className="text-sm font-medium text-nps-text">
                {t("oracle.daily_lucky_hours")}
              </p>
              <p className="text-sm text-nps-text-dim">
                {dailyInsights.lucky_hours.map((h) => `${h}:00`).join(", ")}
              </p>
            </div>
          )}

          {/* Suggested activities */}
          {dailyInsights.suggested_activities.length > 0 && (
            <div>
              <p className="text-sm font-medium text-nps-text">
                {t("oracle.daily_activities")}
              </p>
              <ul className="list-disc list-inside text-sm text-nps-text-dim ms-1">
                {dailyInsights.suggested_activities.map((activity, i) => (
                  <li key={i}>{activity}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Focus area */}
          {dailyInsights.focus_area && (
            <div>
              <p className="text-sm font-medium text-nps-text">
                {t("oracle.daily_focus")}
              </p>
              <p className="text-sm text-nps-text-dim">
                {dailyInsights.focus_area}
              </p>
            </div>
          )}

          {/* View full reading */}
          {onViewFull && (
            <button
              onClick={() => onViewFull(reading)}
              className="text-sm text-nps-oracle-accent hover:text-nps-oracle-accent/80 font-medium"
            >
              {t("oracle.view_full_reading")}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {generateMutation.error && (
        <div className="text-center py-4">
          <p className="text-sm text-nps-error mb-2">
            {t("oracle.error_submit")}
          </p>
          <button
            onClick={handleGenerate}
            className="text-sm text-nps-oracle-accent hover:text-nps-oracle-accent/80"
          >
            {t("oracle.regenerate")}
          </button>
        </div>
      )}
    </div>
  );
}
