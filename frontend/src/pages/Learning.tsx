import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FadeIn } from "@/components/common/FadeIn";
import { StaggerChildren } from "@/components/common/StaggerChildren";
import { EmptyState } from "@/components/common/EmptyState";
import { CountUp } from "@/components/common/CountUp";
import {
  Brain,
  Lightbulb,
  TrendingUp,
  Zap,
  RefreshCw,
  Star,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { learning } from "@/services/api";
import type { LearningStats, Insight, OracleLearningStats } from "@/types";

// ─── Level configuration ───

interface LevelConfig {
  name: string;
  nameKey: string;
  xpRequired: number;
  color: string;
}

const LEVELS: LevelConfig[] = [
  {
    name: "Novice",
    nameKey: "learning.level_novice",
    xpRequired: 0,
    color: "var(--nps-text-dim)",
  },
  {
    name: "Apprentice",
    nameKey: "learning.level_apprentice",
    xpRequired: 100,
    color: "var(--nps-accent)",
  },
  {
    name: "Adept",
    nameKey: "learning.level_adept",
    xpRequired: 500,
    color: "#10b981",
  },
  {
    name: "Master",
    nameKey: "learning.level_master",
    xpRequired: 2000,
    color: "#f59e0b",
  },
];

function getLevelConfig(level: number): LevelConfig {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)] ?? LEVELS[0];
}

// ─── Subcomponents ───

function LevelProgressCard({
  stats,
  isLoading,
}: {
  stats: LearningStats | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  const level = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const xpNext = stats?.xp_next ?? 100;
  const levelConfig = getLevelConfig(level);
  const progress = xpNext > 0 ? Math.min((xp / xpNext) * 100, 100) : 0;

  return (
    <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-5 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: levelConfig.color }} />
          <h3
            className="text-sm font-semibold"
            style={{ color: levelConfig.color }}
          >
            {isLoading
              ? "..."
              : t("learning.level_label", {
                  level,
                  name: t(levelConfig.nameKey),
                })}
          </h3>
        </div>
        {stats?.capabilities && stats.capabilities.length > 0 && (
          <span className="text-[10px] text-[var(--nps-text-dim)] bg-[var(--nps-glass-bg)] px-2 py-0.5 rounded-full border border-[var(--nps-glass-border-subtle,transparent)]">
            {stats.capabilities[0]}
          </span>
        )}
      </div>

      <div className="h-2.5 bg-[var(--nps-bg-input,var(--nps-glass-bg))] rounded-full overflow-hidden border border-[var(--nps-glass-border-subtle,transparent)]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: isLoading ? "0%" : `${progress}%`,
            backgroundColor: levelConfig.color,
            boxShadow: `0 0 8px ${levelConfig.color}40`,
          }}
        />
      </div>

      <p className="text-xs text-[var(--nps-text-dim)] mt-2">
        {t("learning.xp_progress", { current: xp, max: xpNext })}
      </p>
    </div>
  );
}

function StatsRow({
  stats,
  insightsCount,
  isLoading,
}: {
  stats: LearningStats | undefined;
  insightsCount: number;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  const cards = [
    {
      labelKey: "learning.insights",
      value: insightsCount,
      icon: Lightbulb,
      color: "#f59e0b",
    },
    {
      labelKey: "learning.recommendations",
      value: 0,
      icon: TrendingUp,
      color: "#10b981",
    },
    {
      labelKey: "learning.xp",
      value: stats?.xp ?? 0,
      icon: Zap,
      color: "var(--nps-accent)",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.labelKey}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} style={{ color: card.color }} />
              <p className="text-xs uppercase tracking-wider text-[var(--nps-text-dim)]">
                {t(card.labelKey)}
              </p>
            </div>
            <p className="text-lg font-bold text-[var(--nps-text-bright)]">
              {isLoading ? (
                <span className="inline-block w-8 h-5 bg-[var(--nps-glass-bg)] rounded animate-pulse" />
              ) : (
                <CountUp value={card.value} duration={600} />
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function InsightsSection({
  insights,
  isLoading,
}: {
  insights: Insight[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-[var(--nps-glass-bg)] rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
        <EmptyState
          icon="learning"
          title={t("learning.empty")}
          description={t("learning.no_data", {
            defaultValue:
              "Not enough feedback data yet. Need at least 5 ratings.",
          })}
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-5 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
      <h3 className="text-sm font-semibold text-[var(--nps-text-bright)] mb-3 flex items-center gap-2">
        <Lightbulb size={16} className="text-[#f59e0b]" />
        {t("learning.insights")}
      </h3>
      <StaggerChildren staggerMs={40} className="space-y-2">
        {insights.map((insight, idx) => (
          <div
            key={insight.id ?? idx}
            className="flex items-start gap-3 p-3 rounded-lg bg-[var(--nps-glass-bg)] border border-[var(--nps-glass-border-subtle,transparent)] hover:border-[var(--nps-glass-border)] transition-colors"
          >
            <span
              className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                insight.insight_type === "recommendation"
                  ? "bg-[#10b981]"
                  : "bg-[#f59e0b]"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--nps-text)] leading-relaxed">
                {insight.content}
              </p>
              {insight.source && (
                <p className="text-[10px] text-[var(--nps-text-dim)] mt-1">
                  {insight.source}
                </p>
              )}
            </div>
            <span className="text-[10px] text-[var(--nps-text-dim)] uppercase tracking-wider flex-shrink-0">
              {insight.insight_type}
            </span>
          </div>
        ))}
      </StaggerChildren>
    </div>
  );
}

function OracleFeedbackSection({
  oracleStats,
  isLoading,
  onRecalculate,
  isRecalculating,
}: {
  oracleStats: OracleLearningStats | undefined;
  isLoading: boolean;
  onRecalculate: () => void;
  isRecalculating: boolean;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6">
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 bg-[var(--nps-glass-bg)] rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!oracleStats || oracleStats.total_feedback_count === 0) {
    return null;
  }

  const ratingDistribution = oracleStats.rating_distribution ?? {};
  const maxRatingCount = Math.max(...Object.values(ratingDistribution), 1);

  return (
    <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-5 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--nps-text-bright)] flex items-center gap-2">
          <BarChart3 size={16} className="text-[var(--nps-accent)]" />
          {t("learning.dashboard_title")}
        </h3>
        <button
          type="button"
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-[var(--nps-glass-bg)] border border-[var(--nps-glass-border)] text-[var(--nps-text)] hover:border-[var(--nps-accent)]/50 hover:text-[var(--nps-accent)] transition-all disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            className={isRecalculating ? "animate-spin" : ""}
          />
          {t("learning.recalculate")}
        </button>
      </div>

      {/* Feedback summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-[var(--nps-glass-bg)] border border-[var(--nps-glass-border-subtle,transparent)]">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare size={12} className="text-[var(--nps-text-dim)]" />
            <p className="text-[10px] uppercase tracking-wider text-[var(--nps-text-dim)]">
              {t("learning.total_feedback")}
            </p>
          </div>
          <p className="text-lg font-bold text-[var(--nps-text-bright)]">
            <CountUp value={oracleStats.total_feedback_count} duration={600} />
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--nps-glass-bg)] border border-[var(--nps-glass-border-subtle,transparent)]">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={12} className="text-[#f59e0b]" />
            <p className="text-[10px] uppercase tracking-wider text-[var(--nps-text-dim)]">
              {t("learning.average_rating")}
            </p>
          </div>
          <p className="text-lg font-bold text-[var(--nps-text-bright)]">
            <CountUp
              value={oracleStats.average_rating}
              duration={600}
              decimals={1}
              suffix="/5"
            />
          </p>
        </div>
      </div>

      {/* Rating distribution */}
      {Object.keys(ratingDistribution).length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-[var(--nps-text-dim)] mb-2">
            {t("learning.by_reading_type", {
              defaultValue: "Rating Distribution",
            })}
          </p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating] ?? 0;
              const pct =
                maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--nps-text-dim)] w-4 text-right">
                    {rating}
                  </span>
                  <Star size={10} className="text-[#f59e0b] flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-[var(--nps-bg-input,var(--nps-glass-bg))] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#f59e0b] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--nps-text-dim)] w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section helpfulness */}
      {Object.keys(oracleStats.section_helpful_pct ?? {}).length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-[var(--nps-text-dim)] mb-2">
            {t("learning.section_ratings")}
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(oracleStats.section_helpful_pct).map(
              ([section, pct]) => (
                <span
                  key={section}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-[var(--nps-glass-bg)] border border-[var(--nps-glass-border-subtle,transparent)]"
                >
                  <span className="text-[var(--nps-text)]">{section}</span>
                  <span className="text-[var(--nps-accent)] font-semibold">
                    {Math.round(pct * 100)}%
                  </span>
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {/* Prompt adjustments */}
      {oracleStats.active_prompt_adjustments &&
        oracleStats.active_prompt_adjustments.length > 0 && (
          <div>
            <p className="text-xs text-[var(--nps-text-dim)] mb-2">
              {t("learning.prompt_adjustments")}
            </p>
            <div className="space-y-1">
              {oracleStats.active_prompt_adjustments.map((adj, idx) => (
                <p
                  key={idx}
                  className="text-xs text-[var(--nps-text)] pl-3 border-l-2 border-[var(--nps-accent)]/30"
                >
                  {adj}
                </p>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

// ─── Main component ───

export default function Learning() {
  const { t } = useTranslation();
  usePageTitle("learning.title");
  const queryClient = useQueryClient();
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Fetch learning stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["learningStats"],
    queryFn: () => learning.stats(),
    retry: 1,
  });

  // Fetch insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["learningInsights"],
    queryFn: () => learning.insights(10),
    retry: 1,
  });

  // Fetch oracle learning stats (admin-level feedback aggregates)
  const { data: oracleStats, isLoading: oracleStatsLoading } = useQuery({
    queryKey: ["oracleLearningStats"],
    queryFn: () => learning.learningStats.get(),
    retry: false,
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: () => learning.analyze({ session_id: "latest" }),
    onSuccess: () => {
      setAnalyzeError(null);
      queryClient.invalidateQueries({ queryKey: ["learningStats"] });
      queryClient.invalidateQueries({ queryKey: ["learningInsights"] });
    },
    onError: () => {
      setAnalyzeError(
        t("learning.no_data", {
          defaultValue:
            "Analysis could not be completed. Try again after more readings.",
        }),
      );
    },
  });

  // Recalculate mutation
  const recalcMutation = useMutation({
    mutationFn: () => learning.learningStats.recalculate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oracleLearningStats"] });
    },
  });

  return (
    <div className="flex flex-col gap-6" data-page="learning">
      {/* Page Header */}
      <FadeIn delay={0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[var(--nps-text-bright)]">
              {t("learning.title")}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[var(--nps-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Zap
              size={14}
              className={analyzeMutation.isPending ? "animate-pulse" : ""}
            />
            {analyzeMutation.isPending
              ? t("learning.recalculate", { defaultValue: "Analyzing..." })
              : t("learning.dashboard_title", { defaultValue: "Analyze" })}
          </button>
        </div>
        {analyzeError && (
          <p className="mt-2 text-xs text-red-400">{analyzeError}</p>
        )}
      </FadeIn>

      {/* Level Progress Card */}
      <FadeIn delay={80}>
        <LevelProgressCard stats={stats} isLoading={statsLoading} />
      </FadeIn>

      {/* Stats Row */}
      <FadeIn delay={160}>
        <StatsRow
          stats={stats}
          insightsCount={insights?.length ?? 0}
          isLoading={statsLoading || insightsLoading}
        />
      </FadeIn>

      {/* Insights Section */}
      <FadeIn delay={240}>
        <InsightsSection
          insights={insights ?? []}
          isLoading={insightsLoading}
        />
      </FadeIn>

      {/* Oracle Feedback Dashboard */}
      <FadeIn delay={320}>
        <OracleFeedbackSection
          oracleStats={oracleStats}
          isLoading={oracleStatsLoading}
          onRecalculate={() => recalcMutation.mutate()}
          isRecalculating={recalcMutation.isPending}
        />
      </FadeIn>
    </div>
  );
}
