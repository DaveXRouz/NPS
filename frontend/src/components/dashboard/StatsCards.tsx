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
        icon="📖"
      />
      <StatsCard
        label={t("dashboard.stats_confidence")}
        value={formatConfidence(stats?.average_confidence ?? null, locale)}
        icon="📊"
      />
      <StatsCard
        label={t("dashboard.stats_most_used")}
        value={
          stats?.most_used_type
            ? t(`dashboard.type_${stats.most_used_type}`)
            : "—"
        }
        icon="⭐"
      />
      <StatsCard
        label={t("dashboard.stats_streak")}
        value={t("dashboard.stats_streak_days", {
          count: stats?.streak_days ?? 0,
        })}
        icon="🔥"
      />
    </div>
  );
}
