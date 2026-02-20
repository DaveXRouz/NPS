import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { useArrowNavigation } from "@/hooks/useArrowNavigation";
import { useReadingHistory } from "@/hooks/useOracleReadings";
import { SummaryTab } from "./SummaryTab";
import { DetailsTab } from "./DetailsTab";
import { ExportShareMenu } from "./ExportShareMenu";
import { HeartbeatDisplay } from "./HeartbeatDisplay";
import { LocationDisplay } from "./LocationDisplay";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { ReadingFeedback } from "./ReadingFeedback";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type {
  ConsultationResult,
  ResultsTab,
  HeartbeatData,
  LocationElementData,
  ConfidenceData,
  ConfidenceBoost,
} from "@/types";

interface ReadingResultsProps {
  result: ConsultationResult | null;
  readingId?: number | null;
  heartbeat?: HeartbeatData | null;
  location?: LocationElementData | null;
  confidence?: ConfidenceData | null;
  boosts?: ConfidenceBoost[];
}

const TABS: ResultsTab[] = ["summary", "details", "history"];

const COMPACT_LIMIT = 10;

const TYPE_BADGE_CLASSES: Record<string, string> = {
  reading: "bg-[var(--nps-stat-readings)]/20 text-[var(--nps-stat-readings)]",
  time: "bg-[var(--nps-stat-readings)]/20 text-[var(--nps-stat-readings)]",
  question: "bg-[var(--nps-stat-type)]/20 text-[var(--nps-stat-type)]",
  name: "bg-[var(--nps-accent)]/20 text-[var(--nps-accent)]",
  daily: "bg-[var(--nps-stat-streak)]/20 text-[var(--nps-stat-streak)]",
  multi_user: "bg-[var(--nps-stat-type)]/20 text-[var(--nps-stat-type)]",
};

/** Compact history list shown inside the ReadingResults history tab */
function CompactHistoryList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useReadingHistory({
    limit: COMPACT_LIMIT,
    offset: 0,
    sort_by: "created_at",
    sort_order: "desc",
  });

  if (isLoading) {
    return <LoadingSkeleton variant="list" count={5} />;
  }

  if (isError) {
    return (
      <p className="text-xs text-nps-error text-center py-4">
        {t("dashboard.recent_error")}
      </p>
    );
  }

  if (!data || data.readings.length === 0) {
    return <EmptyState icon="readings" title={t("oracle.history_empty")} />;
  }

  return (
    <div className="space-y-1">
      {data.readings.map((r) => {
        const badge =
          TYPE_BADGE_CLASSES[r.sign_type] ??
          "bg-nps-bg-input text-nps-text-dim";
        const label = r.question || r.sign_value || r.sign_type;
        const dateStr = new Date(r.created_at).toLocaleDateString();
        return (
          <div
            key={r.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--nps-glass-bg)] border border-[var(--nps-glass-border)] hover:border-[var(--nps-accent)]/30 transition-all duration-150"
          >
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded font-medium ${badge}`}
            >
              {r.sign_type}
            </span>
            <span className="flex-1 text-xs text-[var(--nps-text)] truncate">
              {label}
            </span>
            {r.is_favorite && (
              <Star className="w-3 h-3 shrink-0 fill-current text-amber-400" />
            )}
            <span className="shrink-0 text-[10px] text-[var(--nps-text-dim)]">
              {dateStr}
            </span>
          </div>
        );
      })}
      {data.total > COMPACT_LIMIT && (
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="w-full text-center text-xs text-[var(--nps-accent)] hover:underline py-2"
        >
          {t("dashboard.recent_view_all")} ({data.total})
        </button>
      )}
    </div>
  );
}

export const ReadingResults = React.memo(function ReadingResults({
  result,
  readingId,
  heartbeat,
  location,
  confidence,
  boosts = [],
}: ReadingResultsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ResultsTab>("summary");
  const tablistRef = useRef<HTMLDivElement>(null);
  const { handleKeyDown } = useArrowNavigation(tablistRef);

  const tabLabels: Record<ResultsTab, string> = {
    summary: t("oracle.tab_summary"),
    details: t("oracle.tab_details"),
    history: t("oracle.tab_history"),
  };

  return (
    <div className="space-y-3">
      {/* Tab bar + export */}
      <div className="flex items-center justify-between gap-2">
        <div
          ref={tablistRef}
          className="flex gap-1 overflow-x-auto bg-[var(--nps-glass-bg)] backdrop-blur-sm rounded-lg p-1 border border-[var(--nps-glass-border)]"
          role="tablist"
          aria-label={t("oracle.reading_results")}
          onKeyDown={handleKeyDown}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 text-xs rounded-md transition-all duration-200 whitespace-nowrap ${
                activeTab === tab
                  ? "bg-gradient-to-r from-[var(--nps-accent)] to-[var(--nps-stat-readings)] text-white font-medium shadow-[0_0_8px_var(--nps-glass-glow)]"
                  : "text-[var(--nps-text-dim)] hover:text-[var(--nps-text)] hover:bg-[var(--nps-bg-hover)]"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 export-actions">
          <ExportShareMenu
            result={result}
            readingId={readingId}
            readingCardId="reading-card"
          />
        </div>
      </div>

      {/* Tab content — eagerly rendered, hidden via CSS, fade on show */}
      <div id="reading-card">
        <div
          id="tabpanel-summary"
          role="tabpanel"
          aria-labelledby="tab-summary"
          aria-live={activeTab === "summary" ? "polite" : undefined}
          className={activeTab === "summary" ? "nps-animate-fade-in" : "hidden"}
        >
          {/* Confidence meter at top of summary */}
          {(confidence || boosts.length > 0) && (
            <div className="mb-3 p-3 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg">
              <ConfidenceMeter
                confidence={confidence ?? null}
                boosts={boosts}
              />
            </div>
          )}
          <SummaryTab result={result} />
          {/* Feedback form — shown after a reading is generated */}
          {readingId && <ReadingFeedback readingId={readingId} />}
        </div>
        <div
          id="tabpanel-details"
          role="tabpanel"
          aria-labelledby="tab-details"
          aria-live={activeTab === "details" ? "polite" : undefined}
          className={activeTab === "details" ? "nps-animate-fade-in" : "hidden"}
        >
          <DetailsTab result={result} />
          {/* Heartbeat display */}
          <div className="mt-3 p-3 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg">
            <h4 className="text-xs font-medium text-[var(--nps-text-dim)] mb-2">
              {t("oracle.details_heartbeat")}
            </h4>
            <HeartbeatDisplay heartbeat={heartbeat ?? null} />
          </div>
          {/* Location element display */}
          <div className="mt-3 p-3 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg">
            <h4 className="text-xs font-medium text-[var(--nps-text-dim)] mb-2">
              {t("oracle.details_location_element")}
            </h4>
            <LocationDisplay location={location ?? null} />
          </div>
        </div>
        <div
          id="tabpanel-history"
          role="tabpanel"
          aria-labelledby="tab-history"
          aria-live={activeTab === "history" ? "polite" : undefined}
          className={activeTab === "history" ? "nps-animate-fade-in" : "hidden"}
        >
          <CompactHistoryList />
        </div>
      </div>
    </div>
  );
});
