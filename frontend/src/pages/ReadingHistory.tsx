import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import {
  useReadingHistory,
  useDeleteReading,
  useToggleFavorite,
  useReadingStats,
} from "@/hooks/useOracleReadings";
import { ReadingCard } from "@/components/oracle/ReadingCard";
import { ReadingDetail } from "@/components/oracle/ReadingDetail";
import {
  SortSelector,
  type SortOption,
} from "@/components/oracle/SortSelector";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { StaggerChildren } from "@/components/common/StaggerChildren";
import { FadeIn } from "@/components/common/FadeIn";
import type { StoredReading } from "@/types";

const PAGE_SIZE = 12;

type FilterType =
  | ""
  | "reading"
  | "time"
  | "question"
  | "name"
  | "daily"
  | "multi_user";

export function ReadingHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterType>("");
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedReading, setSelectedReading] = useState<StoredReading | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useReadingHistory({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    sign_type: filter || undefined,
    search: searchQuery || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    is_favorite: favoritesOnly ? true : undefined,
  });

  const { data: stats } = useReadingStats();
  const deleteMutation = useDeleteReading();
  const favoriteMutation = useToggleFavorite();

  const filters: { key: FilterType; label: string }[] = [
    { key: "", label: t("oracle.filter_all") },
    { key: "time", label: t("oracle.filter_time") },
    { key: "question", label: t("oracle.filter_question") },
    { key: "name", label: t("oracle.filter_name") },
    { key: "daily", label: t("oracle.filter_daily") },
    { key: "multi_user", label: t("oracle.filter_multi") },
  ];

  function handleFilterChange(key: FilterType) {
    setFilter(key);
    setPage(0);
    setSelectedReading(null);
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id);
    if (selectedReading?.id === id) setSelectedReading(null);
  }

  function handleToggleFavorite(id: number) {
    favoriteMutation.mutate(id);
  }

  function handleSelectReading(id: number) {
    const reading = data?.readings.find((r) => r.id === id);
    if (reading) setSelectedReading(reading);
  }

  const readings = data?.readings;
  const sortedReadings = useMemo(() => {
    if (!readings) return [];
    return readings.slice().sort((a, b) => {
      if (sortBy === "oldest") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      if (sortBy === "confidence") {
        const confA =
          (a.reading_result as Record<string, unknown>)?.confidence ?? 0;
        const confB =
          (b.reading_result as Record<string, unknown>)?.confidence ?? 0;
        return (confB as number) - (confA as number);
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [readings, sortBy]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  if (selectedReading) {
    return (
      <div className="space-y-4">
        <FadeIn delay={0}>
          <button
            type="button"
            onClick={() => setSelectedReading(null)}
            className="flex items-center gap-2 text-sm text-[var(--nps-accent)] hover:underline transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("nav.history")}
          </button>
        </FadeIn>
        <FadeIn delay={80}>
          <ReadingDetail
            reading={selectedReading}
            onClose={() => setSelectedReading(null)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
          />
        </FadeIn>
      </div>
    );
  }

  if (isError) {
    return (
      <FadeIn delay={0}>
        <div className="text-center py-16">
          <p className="text-sm text-red-400 mb-4">
            {t("oracle.error_history")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-5 py-2.5 text-sm bg-[var(--nps-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {t("common.retry")}
          </button>
        </div>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn delay={0}>
        <div>
          <h1 className="text-2xl font-bold text-[var(--nps-text-bright)] mb-1">
            {t("nav.history")}
          </h1>
          <p className="text-sm text-[var(--nps-text-dim)]">
            {t("oracle.history_subtitle")}
          </p>
        </div>
      </FadeIn>

      {/* Stats bar */}
      {stats && (
        <FadeIn delay={80}>
          <div className="flex gap-6 text-sm text-[var(--nps-text-dim)]">
            <span>
              {t("oracle.stats_total", { count: stats.total_readings })}
            </span>
            <span>
              {t("oracle.stats_favorites", { count: stats.favorites_count })}
            </span>
          </div>
        </FadeIn>
      )}

      {/* Filter controls */}
      <FadeIn delay={160}>
        <div className="space-y-3">
          {/* Search + Favorites + Sort */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--nps-text-dim)] pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("oracle.search_placeholder")}
                className="w-full ps-10 pe-4 py-2 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] placeholder-[var(--nps-text-dim)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-200"
              />
            </div>
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${
                favoritesOnly
                  ? "border-amber-500/40 text-amber-400 bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.1)]"
                  : "border-[var(--nps-glass-border)] text-[var(--nps-text-dim)] hover:text-[var(--nps-text)] bg-[var(--nps-glass-bg)] backdrop-blur-sm"
              }`}
              title={t("oracle.filter_favorites")}
            >
              {favoritesOnly ? "\u2605" : "\u2606"}
            </button>
            <SortSelector value={sortBy} onChange={setSortBy} />
          </div>

          {/* Date range */}
          <div className="flex gap-3 items-center flex-wrap">
            <label className="text-sm text-[var(--nps-text-dim)]">
              {t("oracle.date_from_label")}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className="px-3 py-1.5 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-200"
            />
            <span className="text-sm text-[var(--nps-text-dim)]">
              {t("oracle.date_to_label")}
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className="px-3 py-1.5 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-200"
            />
          </div>

          {/* Filter chips */}
          <div
            role="tablist"
            aria-label={t("a11y.filter_readings")}
            className="flex gap-2 flex-wrap"
          >
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`px-4 py-2 text-sm rounded-full border transition-all duration-200 ${
                  filter === f.key
                    ? "bg-[var(--nps-accent)]/20 text-[var(--nps-accent)] border-[var(--nps-accent)]/40 shadow-[0_0_8px_var(--nps-glass-glow)]"
                    : "bg-[var(--nps-glass-bg)] backdrop-blur-sm text-[var(--nps-text-dim)] border-[var(--nps-glass-border)] hover:text-[var(--nps-text)] hover:border-[var(--nps-accent)]/20"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Loading */}
      {isLoading && (
        <FadeIn delay={240}>
          <LoadingSkeleton variant="grid" count={6} />
        </FadeIn>
      )}

      {/* Empty */}
      {data && sortedReadings.length === 0 && (
        <FadeIn delay={240}>
          <EmptyState
            icon="readings"
            title={t("oracle.history_empty")}
            action={{
              label: t("dashboard.recent_start"),
              onClick: () => navigate("/oracle"),
            }}
          />
        </FadeIn>
      )}

      {/* Card grid */}
      {data && sortedReadings.length > 0 && (
        <>
          <FadeIn delay={240}>
            <StaggerChildren
              staggerMs={40}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {sortedReadings.map((reading) => (
                <ReadingCard
                  key={reading.id}
                  reading={reading}
                  onSelect={handleSelectReading}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                />
              ))}
            </StaggerChildren>
          </FadeIn>

          {/* Pagination */}
          <FadeIn delay={320}>
            <div className="flex items-center justify-between text-sm pt-2">
              <span className="text-[var(--nps-text-dim)]">
                {t("oracle.history_count", { count: data.total })}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] text-[var(--nps-text)] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-200"
                  >
                    &lsaquo;
                  </button>
                  <span className="text-[var(--nps-text-dim)] px-3">
                    {t("oracle.page_indicator", {
                      current: page + 1,
                      total: totalPages,
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] text-[var(--nps-text)] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-200"
                  >
                    &rsaquo;
                  </button>
                </div>
              )}
            </div>
          </FadeIn>
        </>
      )}
    </div>
  );
}

export default ReadingHistory;
