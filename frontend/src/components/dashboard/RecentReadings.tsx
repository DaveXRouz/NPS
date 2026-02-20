import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import type { StoredReading } from "@/types";

interface RecentReadingsProps {
  readings: StoredReading[];
  isLoading: boolean;
  isError: boolean;
  total: number;
  onRetry?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  time: "bg-nps-oracle-accent/15 text-nps-oracle-accent",
  name: "bg-[var(--nps-accent)]/15 text-[var(--nps-accent)]",
  question: "bg-nps-warning/15 text-nps-warning",
  daily: "bg-nps-success/15 text-nps-success",
  reading: "bg-nps-oracle-accent/15 text-nps-oracle-accent",
  multi_user: "bg-nps-purple/15 text-nps-purple",
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  time: "var(--nps-stat-readings)",
  name: "var(--nps-accent)",
  question: "var(--nps-stat-streak)",
  daily: "var(--nps-stat-confidence)",
  reading: "var(--nps-stat-readings)",
  multi_user: "var(--nps-stat-type)",
};

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  const colorClass =
    TYPE_COLORS[type] ?? "bg-nps-bg-elevated text-nps-text-dim";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}
      data-testid="type-badge"
    >
      {t(`dashboard.type_${type}`, type)}
    </span>
  );
}

function normalizeConfidence(val: number): number {
  // Normalize to 0-100 scale
  return val > 1 ? Math.round(val) : Math.round(val * 100);
}

function getConfidenceColor(pct: number): string {
  if (pct < 40) return "var(--nps-error, #f85149)";
  if (pct < 70) return "#f59e0b";
  if (pct < 90) return "var(--nps-stat-confidence)";
  return "var(--nps-stat-streak)";
}

function getConfidence(reading: StoredReading): number | null {
  const result = reading.reading_result;
  if (!result) return null;
  return typeof result.confidence === "number" ? result.confidence : null;
}

export function RecentReadings({
  readings,
  isLoading,
  isError,
  total,
  onRetry,
}: RecentReadingsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatRelative } = useFormattedDate();

  if (isLoading) {
    return (
      <div data-testid="recent-loading">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-36 bg-nps-bg-elevated rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 w-16 bg-nps-bg-elevated rounded mb-2" />
              <div className="h-3 w-24 bg-nps-bg-elevated rounded mb-2" />
              <div className="h-3 w-full bg-nps-bg-elevated rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="recent-error">
        <h2 className="text-lg font-semibold text-nps-text-bright mb-4">
          {t("dashboard.recent_title")}
        </h2>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-nps-error/30 rounded-xl p-6 text-center">
          <p className="text-nps-error mb-3">{t("dashboard.recent_error")}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm rounded-lg bg-nps-bg-elevated text-nps-text hover:text-nps-text-bright transition-colors nps-btn-lift"
            >
              {t("common.retry")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="recent-readings">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-nps-text-bright">
          {t("dashboard.recent_title")}
        </h2>
        {total > 5 && (
          <Link
            to="/history"
            className="text-sm text-[var(--nps-accent)] hover:underline"
          >
            {t("dashboard.recent_view_all")}
          </Link>
        )}
      </div>

      {readings.length === 0 ? (
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 text-center">
          <p className="text-nps-text-dim mb-3">
            {t("dashboard.recent_empty")}
          </p>
          <button
            onClick={() => navigate("/oracle")}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--nps-accent)] text-white hover:opacity-90 transition-opacity nps-btn-lift"
          >
            {t("dashboard.recent_start")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readings.map((reading) => {
            const rawConfidence = getConfidence(reading);
            const pct =
              rawConfidence !== null
                ? normalizeConfidence(rawConfidence)
                : null;
            const borderColor =
              TYPE_BORDER_COLORS[reading.sign_type] ??
              "var(--nps-glass-border)";

            return (
              <button
                key={reading.id}
                onClick={() => navigate(`/oracle?reading=${reading.id}`)}
                className="group bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 text-start nps-card-hover"
                style={{
                  borderInlineStartWidth: "2px",
                  borderInlineStartColor: borderColor,
                }}
                data-testid="reading-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <TypeBadge type={reading.sign_type} />
                  <span className="text-xs text-nps-text-dim">
                    {formatRelative(reading.created_at)}
                  </span>
                </div>
                <p className="text-sm text-nps-text line-clamp-2 mb-3">
                  {reading.question ||
                    reading.sign_value ||
                    reading.ai_interpretation?.slice(0, 80) ||
                    "—"}
                </p>
                {pct !== null && (
                  <div className="flex items-center gap-2 text-xs text-nps-text-dim">
                    <span>{t("dashboard.confidence", "Confidence")}</span>
                    <div className="flex-1 h-1.5 bg-[var(--nps-bg-card)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: getConfidenceColor(pct),
                        }}
                      />
                    </div>
                    <span
                      className="tabular-nums"
                      style={{ fontFamily: "var(--nps-font-mono)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
