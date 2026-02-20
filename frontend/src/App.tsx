import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { PageLoadingFallback } from "./components/common/PageLoadingFallback";
import { AdminGuard } from "./components/admin/AdminGuard";
import { FadeIn } from "./components/common/FadeIn";
import "./styles/rtl.css";
import "./styles/animations.css";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Oracle = lazy(() => import("./pages/Oracle"));
const ReadingHistory = lazy(() => import("./pages/ReadingHistory"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminProfiles = lazy(() => import("./pages/AdminProfiles"));
const SharedReading = lazy(() => import("./pages/SharedReading"));
const AdminMonitoring = lazy(() => import("./pages/AdminMonitoring"));
const BackupManager = lazy(() => import("./components/admin/BackupManager"));
const Vault = lazy(() => import("./pages/Vault"));
const Learning = lazy(() => import("./pages/Learning"));

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <FadeIn delay={0}>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-8 max-w-md w-full shadow-[0_0_24px_var(--nps-glass-glow)]">
          <div className="text-4xl mb-4 text-[var(--nps-text-dim)]">404</div>
          <h2 className="text-xl font-bold text-[var(--nps-text-bright)] mb-2">
            {t("errors.not_found")}
          </h2>
          <Link
            to="/dashboard"
            className="mt-4 inline-block px-4 py-2 text-sm bg-nps-bg-button text-white rounded hover:opacity-90 transition-opacity"
          >
            {t("common.go_home")}
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === "fa" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Public share page — no layout/sidebar */}
        <Route
          path="/share/:token"
          element={
            <ErrorBoundary>
              <SharedReading />
            </ErrorBoundary>
          }
        />

        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            }
          />
          <Route
            path="/oracle"
            element={
              <ErrorBoundary>
                <Oracle />
              </ErrorBoundary>
            }
          />
          <Route
            path="/history"
            element={
              <ErrorBoundary>
                <ReadingHistory />
              </ErrorBoundary>
            }
          />
          <Route
            path="/settings"
            element={
              <ErrorBoundary>
                <Settings />
              </ErrorBoundary>
            }
          />
          <Route
            path="/vault"
            element={
              <ErrorBoundary>
                <Vault />
              </ErrorBoundary>
            }
          />
          <Route
            path="/learning"
            element={
              <ErrorBoundary>
                <Learning />
              </ErrorBoundary>
            }
          />
          <Route element={<AdminGuard />}>
            <Route
              path="/admin"
              element={
                <ErrorBoundary>
                  <Admin />
                </ErrorBoundary>
              }
            >
              <Route index element={<Navigate to="/admin/users" replace />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="profiles" element={<AdminProfiles />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="backups" element={<BackupManager />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
