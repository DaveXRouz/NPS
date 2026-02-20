import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { adminHealth } from "@/services/api";
import { StaggerChildren } from "@/components/common/StaggerChildren";
import { FadeIn } from "@/components/common/FadeIn";
import type { DetailedHealth, ServiceStatus } from "@/types";

const STATUS_CSS_VARS: Record<string, string> = {
  healthy: "var(--nps-status-healthy)",
  unhealthy: "var(--nps-status-unhealthy)",
  degraded: "var(--nps-status-degraded)",
  not_connected: "var(--nps-status-unknown)",
  not_deployed: "var(--nps-status-unknown)",
  not_configured: "var(--nps-status-unknown)",
  direct_mode: "var(--nps-accent)",
  configured: "var(--nps-accent)",
  external: "var(--nps-accent)",
};

function StatusIndicator({ status }: { status: string }) {
  const color = STATUS_CSS_VARS[status] || "var(--nps-status-unknown)";
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const SERVICE_LABELS: Record<string, string> = {
  api: "API",
  database: "Database",
  redis: "Redis",
  oracle_service: "Oracle",
  telegram: "Telegram",
  nginx: "Nginx",
};

function ServiceCard({
  name,
  service,
}: {
  name: string;
  service: ServiceStatus;
}) {
  const label = SERVICE_LABELS[name] || name;
  const detail =
    service.mode ||
    (service.used_memory_human ? `Mem: ${service.used_memory_human}` : null) ||
    (service.size_bytes != null
      ? `DB: ${formatBytes(service.size_bytes)}`
      : null) ||
    service.version ||
    service.note ||
    "";

  return (
    <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <StatusIndicator status={service.status} />
        <span className="text-sm font-medium text-[var(--nps-text-bright)]">
          {label}
        </span>
      </div>
      <p className="text-xs text-[var(--nps-text-dim)] capitalize">
        {service.status.replace(/_/g, " ")}
      </p>
      {detail && (
        <p className="text-xs text-[var(--nps-text-dim)] mt-1">{detail}</p>
      )}
      {service.error && (
        <p
          className="text-xs mt-1 truncate"
          style={{ color: "var(--nps-status-unhealthy)" }}
          title={service.error}
        >
          {service.error}
        </p>
      )}
    </div>
  );
}

export function HealthDashboard() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<DetailedHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await adminHealth.detailed();
      setHealth(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch health data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading && !health) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-[var(--nps-glass-glow)] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[var(--nps-glass-glow)] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div
        className="backdrop-blur-sm rounded-xl p-4"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--nps-status-unhealthy) 10%, transparent)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor:
            "color-mix(in srgb, var(--nps-status-unhealthy) 30%, transparent)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--nps-status-unhealthy)" }}>
          {error}
        </p>
        <button
          onClick={fetchHealth}
          className="mt-2 py-2 px-3 min-h-[44px] text-sm text-[var(--nps-accent)] hover:text-[var(--nps-text-bright)] transition-colors"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-4">
      {/* System info bar */}
      <FadeIn delay={0}>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <StatusIndicator status={health.status} />
              <span className="font-medium text-[var(--nps-text-bright)] capitalize">
                {health.status}
              </span>
            </div>
            <span className="text-[var(--nps-text-dim)]">
              {t("admin.health_uptime")}: {formatUptime(health.uptime_seconds)}
            </span>
            <span className="text-[var(--nps-text-dim)]">
              {t("admin.health_memory")}: {health.system.process_memory_mb} MB
            </span>
            <span className="text-[var(--nps-text-dim)]">
              {t("admin.health_cpus")}: {health.system.cpu_count}
            </span>
            <span className="text-[var(--nps-text-dim)]">
              {t("admin.health_python")} {health.system.python_version}
            </span>
          </div>
        </div>
      </FadeIn>

      {/* Service cards */}
      <StaggerChildren
        staggerMs={40}
        baseDelay={80}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {Object.entries(health.services).map(([name, service]) => (
          <ServiceCard key={name} name={name} service={service} />
        ))}
      </StaggerChildren>

      {/* Footer with last refresh + refresh button */}
      <FadeIn delay={240}>
        <div className="flex items-center justify-between text-xs text-[var(--nps-text-dim)]">
          <span>
            {t("admin.health_last_refresh")}:{" "}
            {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}
          </span>
          <button
            onClick={fetchHealth}
            className="px-3 py-2 min-h-[44px] bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text-dim)] hover:text-[var(--nps-text-bright)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
          >
            {t("admin.health_refresh_now")}
          </button>
        </div>
      </FadeIn>
    </div>
  );
}
