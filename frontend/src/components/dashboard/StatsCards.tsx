import { useTranslation } from "react-i18next";
import type { DashboardStats } from "@/types";
import { StatsCard } from "@/components/StatsCard";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading: boolean;
}

function formatConfidence(value: number | null, locale: string): string {
  if (value === null) return "—";
  const pct = Math.round(value * 100);
  return (
    new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(pct) + "%"
  );
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(
    value,
  );
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  if (isLoading) {
    return (
      <div data-testid="stats-loading">
        <LoadingSkeleton variant="grid" />
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="stats-cards"
    >
      <StatsCard
        label={t("dashboard.stats_total")}
        value={formatNumber(stats?.total_readings ?? 0, locale)}
        icon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        }
      />
      <StatsCard
        label={t("dashboard.stats_confidence")}
        value={formatConfidence(stats?.average_confidence ?? null, locale)}
        icon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        }
      />
      <StatsCard
        label={t("dashboard.stats_most_used")}
        value={
          stats?.most_used_type
            ? t(`dashboard.type_${stats.most_used_type}`)
            : "—"
        }
        icon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        }
      />
      <StatsCard
        label={t("dashboard.stats_streak")}
        value={t("dashboard.stats_streak_days", {
          count: stats?.streak_days ?? 0,
        })}
        icon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      />
    </div>
  );
}
