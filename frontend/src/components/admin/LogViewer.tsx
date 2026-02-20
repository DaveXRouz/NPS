import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { adminHealth } from "@/services/api";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { FadeIn } from "@/components/common/FadeIn";
import type { AuditLogEntry } from "@/types";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border border-red-500/30",
  critical: "bg-red-700/20 text-red-300 border border-red-700/30",
};

const PAGE_SIZE = 25;

const TIME_WINDOWS = [
  { label: "1h", value: 1 },
  { label: "6h", value: 6 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
];

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    SEVERITY_COLORS[severity] ||
    "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase ${cls}`}
    >
      {severity}
    </span>
  );
}

export function LogViewer() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormattedDate();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [hours, setHours] = useState(24);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(
    async (currentOffset: number, currentSearch: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminHealth.logs({
          limit: PAGE_SIZE,
          offset: currentOffset,
          severity: severity || undefined,
          search: currentSearch || undefined,
          hours,
        });
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err: unknown) {
        const msg =
          (err as { message?: string })?.message || "Failed to load logs";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [severity, hours],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Reset offset and fetch when filters change
  useEffect(() => {
    setOffset(0);
    fetchLogs(0, search);
  }, [severity, hours, fetchLogs, search]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      fetchLogs(0, value);
    }, 500);
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    fetchLogs(newOffset, search);
  };

  const showFrom = offset + 1;
  const showTo = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <FadeIn delay={0}>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            <option value="">{t("admin.monitoring_all_severities")}</option>
            <option value="info">{t("admin.log_severity_info")}</option>
            <option value="warning">{t("admin.log_severity_warning")}</option>
            <option value="error">{t("admin.log_severity_error")}</option>
            <option value="critical">{t("admin.log_severity_critical")}</option>
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("admin.monitoring_search_logs")}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--nps-text)] w-48 placeholder:text-[var(--nps-text-dim)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          />

          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            {TIME_WINDOWS.map((tw) => (
              <option key={tw.value} value={tw.value}>
                {tw.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchLogs(offset, search)}
            className="px-3 py-2 min-h-[44px] bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-sm text-[var(--nps-text-dim)] hover:text-[var(--nps-text-bright)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            {t("common.refresh")}
          </button>
        </div>
      </FadeIn>

      {/* Log table */}
      <FadeIn delay={80}>
        <div className="overflow-x-auto bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-[var(--nps-glass-border)] text-[var(--nps-text-dim)] text-xs">
                <th className="text-start py-2 px-3">
                  {t("admin.log_col_time")}
                </th>
                <th className="text-start py-2 px-3">
                  {t("admin.log_col_severity")}
                </th>
                <th className="text-start py-2 px-3">
                  {t("admin.log_col_action")}
                </th>
                <th className="text-start py-2 px-3">
                  {t("admin.log_col_resource")}
                </th>
                <th className="text-start py-2 px-3">
                  {t("admin.log_col_status")}
                </th>
                <th className="text-start py-2 px-3">
                  {t("admin.log_col_ip")}
                </th>
              </tr>
            </thead>
            <tbody>
              {error && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <p className="text-nps-error text-sm mb-2">{error}</p>
                    <button
                      onClick={() => fetchLogs(offset, search)}
                      className="px-3 py-2 min-h-[44px] text-xs rounded-lg bg-nps-bg-elevated text-nps-text hover:text-nps-text-bright transition-colors"
                    >
                      {t("common.retry")}
                    </button>
                  </td>
                </tr>
              ) : loading && logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-[var(--nps-text-dim)]"
                  >
                    {t("admin.log_loading")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-[var(--nps-text-dim)]"
                  >
                    {t("admin.log_no_entries")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() =>
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                      className="border-b border-[var(--nps-glass-border)]/50 hover:bg-[var(--nps-glass-glow)] cursor-pointer text-[var(--nps-text)] transition-colors duration-150"
                    >
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        {log.timestamp ? formatDateTime(log.timestamp) : "—"}
                      </td>
                      <td className="py-1.5 px-3">
                        <SeverityBadge severity={log.severity} />
                      </td>
                      <td className="py-1.5 px-3">{log.action}</td>
                      <td className="py-1.5 px-3 text-[var(--nps-text-dim)]">
                        {log.resource_type || "—"}
                      </td>
                      <td className="py-1.5 px-3">
                        {log.success ? (
                          <span className="text-green-400">
                            {t("admin.log_status_ok")}
                          </span>
                        ) : (
                          <span className="text-red-400">
                            {t("admin.log_status_fail")}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-[var(--nps-text-dim)]">
                        {log.ip_address || "—"}
                      </td>
                    </tr>
                    {expandedId === log.id && log.details && (
                      <tr key={`${log.id}-detail`}>
                        <td
                          colSpan={6}
                          className="py-2 px-4 bg-[var(--nps-glass-glow)]"
                        >
                          <pre className="font-mono text-xs text-[var(--nps-text-dim)] overflow-x-auto p-3 bg-black/30 backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FadeIn>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-xs text-[var(--nps-text-dim)]">
          <span>
            {t("common.showing_range", { from: showFrom, to: showTo, total })}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => handlePageChange(Math.max(0, offset - PAGE_SIZE))}
              className="px-3 py-2 min-h-[44px] bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-sm hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--nps-glass-border)] disabled:hover:shadow-none transition-all duration-200"
            >
              {t("common.prev")}
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => handlePageChange(offset + PAGE_SIZE)}
              className="px-3 py-2 min-h-[44px] bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-sm hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--nps-glass-border)] disabled:hover:shadow-none transition-all duration-200"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
