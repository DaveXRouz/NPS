import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MoonPhaseIcon } from "@/components/common/icons";

interface DailyInsightResponse {
  date: string;
  summary: string;
  fc60_stamp?: string;
  moon_phase?: string;
  energy_level?: number;
  advice?: string[];
}

interface DailyReadingCardProps {
  dailyReading?: DailyInsightResponse | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function DailyReadingCard({
  dailyReading,
  isLoading,
  isError,
  onRetry,
}: DailyReadingCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div
        className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-6 animate-pulse"
        data-testid="daily-loading"
      >
        <div className="h-5 w-40 bg-nps-bg-elevated rounded mb-3" />
        <div className="h-4 w-full bg-nps-bg-elevated rounded mb-2" />
        <div className="h-4 w-2/3 bg-nps-bg-elevated rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-nps-error/30 rounded-xl p-6"
        data-testid="daily-error"
      >
        <h2 className="text-lg font-semibold text-nps-text-bright">
          {t("dashboard.daily_reading")}
        </h2>
        <p className="text-sm text-nps-text-dim mt-2">
          {t("dashboard.daily_error")}
        </p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 text-sm rounded-lg bg-nps-oracle-accent text-white hover:opacity-90 transition-opacity"
        >
          {t("dashboard.daily_retry")}
        </button>
      </div>
    );
  }

  if (!dailyReading) {
    return (
      <div
        className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-6"
        data-testid="daily-empty"
      >
        <h2 className="text-lg font-semibold text-nps-text-bright">
          {t("dashboard.daily_reading")}
        </h2>
        <p className="text-sm text-nps-text-dim mt-2">
          {t("dashboard.daily_no_reading")}
        </p>
        <button
          onClick={() => navigate("/oracle?type=daily")}
          className="mt-3 px-4 py-2 text-sm rounded-lg bg-nps-success text-white hover:opacity-90 transition-opacity animate-pulse"
          data-testid="generate-daily-btn"
        >
          {t("dashboard.daily_generate")}
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(15, 26, 46, 0.85) 0%, rgba(79, 195, 247, 0.06) 100%)",
      }}
      data-testid="daily-card"
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Header with moon phase */}
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-nps-text-bright">
            {t("dashboard.daily_reading")}
          </h2>
          {dailyReading.moon_phase && (
            <MoonPhaseIcon phaseName={dailyReading.moon_phase} size={28} />
          )}
        </div>

        {/* Summary */}
        <p className="text-sm text-nps-text leading-relaxed mb-4">
          {dailyReading.summary}
        </p>

        {/* FC60 stamp badge */}
        {dailyReading.fc60_stamp && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-nps-oracle-accent/10 border border-nps-oracle-accent/25 rounded-lg mb-4">
            <span className="text-xs font-mono text-nps-oracle-accent">
              {dailyReading.fc60_stamp}
            </span>
          </div>
        )}

        {/* Advice list */}
        {dailyReading.advice && dailyReading.advice.length > 0 && (
          <ul className="space-y-2">
            {dailyReading.advice.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-nps-text-dim"
              >
                <span className="text-nps-oracle-accent mt-0.5 shrink-0">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
