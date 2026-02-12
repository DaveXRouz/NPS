import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Navigation } from "./Navigation";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { useWebSocketConnection } from "@/hooks/useWebSocket";

export function Layout() {
  const { t } = useTranslation();
  useWebSocketConnection();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nps_sidebar_collapsed") === "true";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("nps_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-[var(--nps-bg)]">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 z-40
          ${mobileSidebarOpen ? "ltr:left-0 rtl:right-0" : "ltr:-left-64 rtl:-right-64 md:ltr:left-0 md:rtl:right-0"}
          ${sidebarCollapsed ? "md:w-16" : "md:w-64"} w-64
          bg-[var(--nps-bg-sidebar)] border-e border-[var(--nps-border)]
          flex flex-col transition-all duration-200
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-[var(--nps-border)] flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--nps-accent)]">
            NPS
          </span>
          {!sidebarCollapsed && (
            <span className="text-xs text-[var(--nps-text-dim)]">
              {t("layout.app_tagline")}
            </span>
          )}
        </div>

        {/* Navigation */}
        <Navigation
          collapsed={sidebarCollapsed}
          isAdmin={false}
          onItemClick={closeMobileSidebar}
        />

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex items-center justify-center p-3 border-t border-[var(--nps-border)] text-[var(--nps-text-dim)] hover:text-[var(--nps-text)] transition-colors"
          aria-label={
            sidebarCollapsed
              ? t("layout.sidebar_expand")
              : t("layout.sidebar_collapse")
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className={`transition-transform ${sidebarCollapsed ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180"}`}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[var(--nps-bg-card)] border-b border-[var(--nps-border)] flex items-center justify-between px-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-[var(--nps-text-dim)] hover:text-[var(--nps-text)]"
            aria-label={t("layout.mobile_menu")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="hidden md:block" />

          {/* Right toggles */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 md:p-6 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-[var(--nps-border)] text-center text-xs text-[var(--nps-text-dim)]">
          {t("layout.footer_copyright")} &middot; {t("layout.version")}
        </footer>
      </div>
    </div>
  );
}
