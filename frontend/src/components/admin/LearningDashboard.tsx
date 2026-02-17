import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Star as StarIcon } from "lucide-react";
import { StarRating } from "../oracle/StarRating";
import * as api from "@/services/api";
import type { OracleLearningStats } from "@/types";

export function LearningDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<OracleLearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.learning.learningStats.get();
      setStats(data);
      setError(null);
    } catch {
      setError("Failed to load learning stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      const data = await api.learning.learningStats.recalculate();
      setStats(data);
    } catch {
      setError("Recalculation failed");
    } finally {
      setRecalculating(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-nps-text-dim text-sm">{t("common.loading")}</div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-400 text-sm">{error}</div>;
  }

  if (!stats || stats.total_feedback_count < 5) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-medium text-nps-text mb-2">
          {t("learning.dashboard_title")}
        </h2>
        <p className="text-sm text-nps-text-dim">{t("learning.no_data")}</p>
      </div>
    );
  }

  const maxRatingCount = Math.max(
    ...Object.values(stats.rating_distribution),
    1,
  );

  return (
    <div className="space-y-6 p-4" data-testid="learning-dashboard">
      <h2 className="text-lg font-medium text-nps-text">
        {t("learning.dashboard_title")}
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-nps-bg-card border border-nps-border/30 rounded">
          <p className="text-xs text-nps-text-dim">
            {t("learning.total_feedback")}
          </p>
          <p className="text-2xl font-bold text-nps-text">
            {stats.total_feedback_count}
          </p>
        </div>
        <div className="p-3 bg-nps-bg-card border border-nps-border/30 rounded">
          <p className="text-xs text-nps-text-dim">
            {t("learning.average_rating")}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-nps-text">
              {stats.average_rating.toFixed(1)}
            </span>
            <StarRating
              value={Math.round(stats.average_rating)}
              readonly
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Rating distribution */}
      <div className="p-3 bg-nps-bg-card border border-nps-border/30 rounded">
        <h3 className="text-sm font-medium text-nps-text mb-2">
          Rating Distribution
        </h3>
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.rating_distribution[star] || 0;
            const pct = (count / maxRatingCount) * 100;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-nps-text-dim text-end flex items-center justify-end gap-0.5">
                  {star}
                  <StarIcon className="w-3 h-3 fill-current text-yellow-400" />
                </span>
                <div className="flex-1 h-3 bg-nps-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-nps-text-dim">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By reading type */}
      {Object.keys(stats.avg_by_reading_type).length > 0 && (
        <div className="p-3 bg-nps-bg-card border border-nps-border/30 rounded">
          <h3 className="text-sm font-medium text-nps-text mb-2">
            {t("learning.by_reading_type")}
          </h3>
          <div className="space-y-1">
            {Object.entries(stats.avg_by_reading_type).map(([type, avg]) => (
              <div
                key={type}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-nps-text capitalize">{type}</span>
                <div className="flex items-center gap-1">
                  <span className="text-nps-text-dim">{avg.toFixed(1)}</span>
                  <StarRating value={Math.round(avg)} readonly size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section helpfulness */}
      {Object.keys(stats.section_helpful_pct).length > 0 && (
        <div className="p-3 bg-nps-bg-card border border-nps-border/30 rounded">
          <h3 className="text-sm font-medium text-nps-text mb-2">
            {t("learning.section_ratings")}
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.section_helpful_pct).map(([section, pct]) => (
              <div key={section} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-nps-text capitalize">
                    {section.replace("_", " ")}
                  </span>
                  <span className="text-nps-text-dim">
                    {(pct * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-nps-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 0.7
                        ? "bg-green-500"
                        : pct >= 0.4
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt adjustments */}
      <div className="p-3 bg-nps-bg-card border border-nps-border/30 rounded">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-nps-text">
            {t("learning.prompt_adjustments")}
          </h3>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="text-xs px-2 py-1 rounded bg-nps-oracle-accent text-nps-bg hover:opacity-90 disabled:opacity-40"
            data-testid="recalculate-btn"
          >
            {recalculating ? "..." : t("learning.recalculate")}
          </button>
        </div>
        {stats.active_prompt_adjustments.length > 0 ? (
          <ul className="space-y-1">
            {stats.active_prompt_adjustments.map((adj, i) => (
              <li
                key={i}
                className="text-xs text-nps-text-dim flex items-start gap-1"
              >
                <span className="text-nps-oracle-accent">•</span>
                <span>{adj}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-nps-text-dim">No active adjustments</p>
        )}
      </div>

      {/* Confidence warning */}
      {stats.total_feedback_count < 25 && (
        <p className="text-xs text-amber-400 text-center">
          <AlertTriangle
            size={14}
            className="inline-block me-1 align-text-bottom"
          />
          Sample size is small ({stats.total_feedback_count} ratings). Results
          become more reliable with 25+ ratings.
        </p>
      )}
    </div>
  );
}
