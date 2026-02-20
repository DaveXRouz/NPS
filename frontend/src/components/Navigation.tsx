import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  disabled?: boolean;
}

interface NavigationProps {
  collapsed: boolean;
  isAdmin?: boolean;
  onItemClick?: () => void;
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function DashboardIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function OracleIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", labelKey: "nav.dashboard", icon: <DashboardIcon /> },
  { path: "/oracle", labelKey: "nav.oracle", icon: <OracleIcon /> },
  { path: "/history", labelKey: "nav.history", icon: <HistoryIcon /> },
  { path: "/settings", labelKey: "nav.settings", icon: <SettingsIcon /> },
  {
    path: "/admin",
    labelKey: "nav.admin",
    icon: <AdminIcon />,
    adminOnly: true,
  },
];

export function Navigation({
  collapsed,
  isAdmin,
  onItemClick,
}: NavigationProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex-1 py-4" role="navigation">
      {NAV_ITEMS.map((item) => {
        if (item.adminOnly && !isAdmin) return null;

        if (item.disabled) {
          return (
            <div
              key={item.path}
              className="flex items-center gap-3 px-4 py-2 mx-2 rounded text-sm text-[var(--nps-text-dim)] cursor-not-allowed opacity-50"
              title={t("layout.coming_soon")}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </div>
          );
        }

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            title={collapsed ? t(item.labelKey) : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 mx-2 rounded text-sm transition-colors ${
                isActive
                  ? "bg-[var(--nps-accent)]/10 text-[var(--nps-accent)] border-s-2 border-[var(--nps-accent)]"
                  : "text-[var(--nps-text-dim)] hover:bg-[var(--nps-bg-hover)] hover:text-[var(--nps-text)]"
              }`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}
