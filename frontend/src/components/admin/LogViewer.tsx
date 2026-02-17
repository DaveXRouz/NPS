import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { adminHealth } from "@/services/api";
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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour12: false });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function LogViewer() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [hours, setHours] = useState(24);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(
    async (currentOffset: number, currentSearch: string) => {
      setLoading(true);
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
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [severity, hours],
  );

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
            className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            <option value="">{t("admin.monitoring_all_severities")}</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("admin.monitoring_search_logs")}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--nps-text)] w-48 placeholder:text-[var(--nps-text-dim)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          />

          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            {TIME_WINDOWS.map((tw) => (
              <option key={tw.value} value={tw.value}>
                {tw.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchLogs(offset, search)}
            className="px-3 py-1.5 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-sm text-[var(--nps-text-dim)] hover:text-[var(--nps-text-bright)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            Refresh
          </button>
        </div>
      </FadeIn>

      {/* Log table */}
      <FadeIn delay={80}>
        <div className="overflow-x-auto bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-[var(--nps-glass-border)] text-[var(--nps-text-dim)] text-xs">
                <th className="text-start py-2 px-3">Time</th>
                <th className="text-start py-2 px-3">Severity</th>
                <th className="text-start py-2 px-3">Action</th>
                <th className="text-start py-2 px-3">Resource</th>
                <th className="text-start py-2 px-3">Status</th>
                <th className="text-start py-2 px-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-[var(--nps-text-dim)]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-[var(--nps-text-dim)]"
                  >
                    No log entries found.
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
                        {log.timestamp ? formatTimestamp(log.timestamp) : "—"}
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
                          <span className="text-green-400">OK</span>
                        ) : (
                          <span className="text-red-400">FAIL</span>
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
                          <pre className="font-mono text-xs text-[var(--nps-text-dim)] overflow-x-auto p-3 bg-black/30 backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg">
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
            Showing {showFrom}–{showTo} of {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => handlePageChange(Math.max(0, offset - PAGE_SIZE))}
              className="px-3 py-1.5 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-sm hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--nps-glass-border)] disabled:hover:shadow-none transition-all duration-200"
            >
              Prev
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => handlePageChange(offset + PAGE_SIZE)}
              className="px-3 py-1.5 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-sm hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--nps-glass-border)] disabled:hover:shadow-none transition-all duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
