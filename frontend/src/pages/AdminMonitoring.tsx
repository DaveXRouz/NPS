import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HealthDashboard } from "@/components/admin/HealthDashboard";
import { LogViewer } from "@/components/admin/LogViewer";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { FadeIn } from "@/components/common/FadeIn";

type MonitoringTab = "health" | "logs" | "analytics";

const TAB_IDS: MonitoringTab[] = ["health", "logs", "analytics"];
const TAB_KEYS: Record<MonitoringTab, string> = {
  health: "admin.monitoring_tab_health",
  logs: "admin.monitoring_tab_logs",
  analytics: "admin.monitoring_tab_analytics",
};

export function AdminMonitoring() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MonitoringTab>("health");

  return (
    <div className="space-y-6">
      <FadeIn delay={0}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--nps-text-bright)]">
            {t("admin.monitoring_system_monitoring")}
          </h2>
        </div>
      </FadeIn>

      {/* Tab navigation */}
      <FadeIn delay={80}>
        <div className="flex gap-2 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-xl p-2">
          {TAB_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? "bg-[var(--nps-accent)]/20 text-[var(--nps-accent)] border border-[var(--nps-accent)]/40 shadow-[0_0_8px_var(--nps-glass-glow)]"
                  : "text-[var(--nps-text-dim)] hover:text-[var(--nps-text)] hover:bg-[var(--nps-glass-glow)] border border-transparent"
              }`}
            >
              {t(TAB_KEYS[id])}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Tab content */}
      <FadeIn delay={160}>
        {activeTab === "health" && <HealthDashboard />}
        {activeTab === "logs" && <LogViewer />}
        {activeTab === "analytics" && <AnalyticsCharts />}
      </FadeIn>
    </div>
  );
}

export default AdminMonitoring;
