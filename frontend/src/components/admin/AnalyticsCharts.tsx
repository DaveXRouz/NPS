import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { adminHealth } from "@/services/api";
import { FadeIn } from "@/components/common/FadeIn";
import { StaggerChildren } from "@/components/common/StaggerChildren";
import type { AnalyticsResponse } from "@/types";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];
const POLL_INTERVAL = 30_000;

const PERIODS = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "365d", value: 365 },
];

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "8px",
  backdropFilter: "blur(8px)",
};

export function AnalyticsCharts() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const data = await adminHealth.analytics(days);
      setAnalytics(data);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to load analytics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--nps-text-dim)]">
        {t("admin.monitoring_loading")}
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-nps-error/30 rounded-xl p-8 text-center">
        <p className="text-nps-error text-sm mb-3">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 text-sm rounded-lg bg-nps-bg-elevated text-nps-text hover:text-nps-text-bright transition-colors nps-btn-lift"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const hasData =
    analytics.readings_per_day.length > 0 ||
    analytics.readings_by_type.length > 0;

  // Fill all 24 hours for popular hours chart
  const hoursData = Array.from({ length: 24 }, (_, hour) => {
    const found = analytics.popular_hours.find((h) => h.hour === hour);
    return { hour: `${hour}:00`, count: found?.count ?? 0 };
  });

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <FadeIn delay={0}>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--nps-text-dim)]">
            {t("admin.monitoring_period")}:
          </span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </FadeIn>

      {/* Summary totals */}
      <StaggerChildren
        staggerMs={40}
        baseDelay={80}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-3 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
          <p className="text-xs text-[var(--nps-text-dim)]">
            {t("admin.monitoring_total_readings")}
          </p>
          <p className="text-lg font-bold text-[var(--nps-text-bright)]">
            {analytics.totals.total_readings}
          </p>
        </div>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-3 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
          <p className="text-xs text-[var(--nps-text-dim)]">
            {t("admin.monitoring_avg_confidence")}
          </p>
          <p className="text-lg font-bold text-[var(--nps-text-bright)]">
            {analytics.totals.avg_confidence}%
          </p>
        </div>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-3 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
          <p className="text-xs text-[var(--nps-text-dim)]">
            {t("admin.monitoring_top_type")}
          </p>
          <p className="text-lg font-bold text-[var(--nps-text-bright)]">
            {analytics.totals.most_popular_type || "—"}
          </p>
        </div>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-3 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
          <p className="text-xs text-[var(--nps-text-dim)]">
            {t("admin.monitoring_peak_hour")}
          </p>
          <p className="text-lg font-bold text-[var(--nps-text-bright)]">
            {analytics.totals.most_active_hour != null
              ? `${analytics.totals.most_active_hour}:00`
              : "—"}
          </p>
        </div>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-3 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
          <p className="text-xs text-[var(--nps-text-dim)]">
            {t("admin.monitoring_errors")}
          </p>
          <p className="text-lg font-bold text-red-400">
            {analytics.totals.error_count}
          </p>
        </div>
      </StaggerChildren>

      {!hasData ? (
        <FadeIn delay={240}>
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-8 text-center text-[var(--nps-text-dim)]">
            {t("admin.monitoring_no_data")}
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={240}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Readings Per Day */}
            <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
              <h3 className="text-sm font-medium text-[var(--nps-text-bright)] mb-3">
                {t("admin.monitoring_readings_per_day")}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.readings_per_day}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Readings By Type */}
            <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
              <h3 className="text-sm font-medium text-[var(--nps-text-bright)] mb-3">
                {t("admin.monitoring_readings_by_type")}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.readings_by_type}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({
                      name,
                      value,
                    }: {
                      name?: string;
                      value?: number;
                    }) => `${name ?? ""}: ${value ?? 0}`}
                  >
                    {analytics.readings_by_type.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Confidence Trend */}
            <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
              <h3 className="text-sm font-medium text-[var(--nps-text-bright)] mb-3">
                {t("admin.monitoring_confidence_trend")}
              </h3>
              {analytics.confidence_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analytics.confidence_trend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number | undefined) => [
                        `${(value ?? 0).toFixed(1)}%`,
                        t("admin.monitoring_confidence_label"),
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_confidence"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#10b981" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-[var(--nps-text-dim)] text-sm">
                  {t("admin.monitoring_no_confidence")}
                </div>
              )}
            </div>

            {/* Chart 4: Popular Hours */}
            <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
              <h3 className="text-sm font-medium text-[var(--nps-text-bright)] mb-3">
                {t("admin.monitoring_popular_hours")}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hoursData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
