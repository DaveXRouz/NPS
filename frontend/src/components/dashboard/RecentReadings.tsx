import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import type { StoredReading } from "@/types";

interface RecentReadingsProps {
  readings: StoredReading[];
  isLoading: boolean;
  isError: boolean;
  total: number;
}

const TYPE_COLORS: Record<string, string> = {
  time: "bg-nps-oracle-accent/15 text-nps-oracle-accent",
  name: "bg-[var(--nps-accent)]/15 text-[var(--nps-accent)]",
  question: "bg-nps-warning/15 text-nps-warning",
  daily: "bg-nps-success/15 text-nps-success",
  reading: "bg-nps-oracle-accent/15 text-nps-oracle-accent",
  multi_user: "bg-nps-purple/15 text-nps-purple",
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

export function RecentReadings({
  readings,
  isLoading,
  isError,
  total,
}: RecentReadingsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
              className="bg-nps-bg-card border border-nps-border rounded-lg p-4 animate-pulse"
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

  if (isError) return null;

  return (
    <div data-testid="recent-readings">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-nps-text-bright">
          {t("dashboard.recent_title")}
        </h2>
        {total > 5 && (
          <Link
            to="/history"
            className="text-sm text-nps-oracle-accent hover:underline"
          >
            {t("dashboard.recent_view_all")}
          </Link>
        )}
      </div>

      {readings.length === 0 ? (
        <div className="bg-nps-bg-card border border-nps-border rounded-xl p-6 text-center">
          <p className="text-nps-text-dim mb-3">
            {t("dashboard.recent_empty")}
          </p>
          <button
            onClick={() => navigate("/oracle")}
            className="px-4 py-2 text-sm rounded-lg bg-nps-oracle-accent text-[var(--nps-bg)] hover:opacity-90 transition-opacity"
          >
            {t("dashboard.recent_start")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {readings.map((reading) => (
            <button
              key={reading.id}
              onClick={() => navigate(`/oracle?reading=${reading.id}`)}
              className="bg-nps-bg-card border border-nps-border rounded-lg p-4 text-start hover:border-nps-oracle-accent transition-colors"
              data-testid="reading-card"
            >
              <div className="flex items-center justify-between mb-2">
                <TypeBadge type={reading.sign_type} />
                <span className="text-xs text-nps-text-dim">
                  {new Date(reading.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-nps-text line-clamp-2">
                {reading.question ||
                  reading.sign_value ||
                  reading.ai_interpretation?.slice(0, 80) ||
                  "—"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
