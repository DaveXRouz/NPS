import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAdminStats } from "@/hooks/useAdmin";
import { FadeIn } from "@/components/common/FadeIn";
import { StaggerChildren } from "@/components/common/StaggerChildren";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-300">
      <p className="text-xs text-[var(--nps-text-dim)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--nps-text-bright)]">
        {value}
      </p>
    </div>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const { data: stats } = useAdminStats();

  const tabClass = (isActive: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-[var(--nps-accent)]/20 text-[var(--nps-accent)] border border-[var(--nps-accent)]/40 shadow-[0_0_8px_var(--nps-glass-glow)]"
        : "text-[var(--nps-text-dim)] hover:text-[var(--nps-text)] hover:bg-[var(--nps-glass-glow)] border border-transparent"
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn delay={0}>
        <div>
          <h1 className="text-xl font-bold text-[var(--nps-text-bright)]">
            {t("admin.title")}
          </h1>
          <p className="text-sm text-[var(--nps-text-dim)]">
            {t("admin.subtitle")}
          </p>
        </div>
      </FadeIn>

      {/* Stats cards */}
      {stats && (
        <StaggerChildren
          staggerMs={40}
          baseDelay={80}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard label={t("admin.total_users")} value={stats.total_users} />
          <StatCard
            label={t("admin.active_users")}
            value={stats.active_users}
          />
          <StatCard
            label={t("admin.total_profiles")}
            value={stats.total_oracle_profiles}
          />
          <StatCard
            label={t("admin.readings_today")}
            value={stats.readings_today}
          />
        </StaggerChildren>
      )}

      {/* Tab navigation */}
      <FadeIn delay={160}>
        <div className="flex gap-2 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-xl p-2">
          <NavLink
            to="/admin/users"
            className={({ isActive }) => tabClass(isActive)}
          >
            {t("admin.tab_users")}
          </NavLink>
          <NavLink
            to="/admin/profiles"
            className={({ isActive }) => tabClass(isActive)}
          >
            {t("admin.tab_profiles")}
          </NavLink>
          <NavLink
            to="/admin/monitoring"
            className={({ isActive }) => tabClass(isActive)}
          >
            {t("admin.tab_monitoring")}
          </NavLink>
          <NavLink
            to="/admin/backups"
            className={({ isActive }) => tabClass(isActive)}
          >
            {t("admin.tab_backups")}
          </NavLink>
        </div>
      </FadeIn>

      {/* Nested content */}
      <FadeIn delay={240}>
        <Outlet />
      </FadeIn>
    </div>
  );
}
