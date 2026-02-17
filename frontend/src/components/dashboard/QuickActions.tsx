import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  key: string;
  icon: ReactNode;
  colorClass: string;
}

const ACTIONS: QuickAction[] = [
  {
    key: "time",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    colorClass: "border-nps-oracle-accent/50 hover:border-nps-oracle-accent",
  },
  {
    key: "question",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    colorClass: "border-nps-gold/50 hover:border-nps-gold",
  },
  {
    key: "name",
    icon: (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    colorClass: "border-nps-oracle-accent/50 hover:border-nps-oracle-accent",
  },
];

export function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div data-testid="quick-actions">
      <h2 className="text-lg font-semibold text-nps-text-bright mb-4">
        {t("dashboard.quick_actions")}
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {ACTIONS.map(({ key, icon, colorClass }) => (
          <button
            key={key}
            onClick={() => navigate(`/oracle?type=${key}`)}
            className={`bg-nps-bg-card border rounded-xl p-4 flex flex-col items-center gap-2 transition-colors ${colorClass}`}
            data-testid={`quick-${key}`}
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm text-nps-text-bright">
              {t(`dashboard.quick_${key}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
