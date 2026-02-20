import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminHealth } from "@/services/api";
import { FadeIn } from "@/components/common/FadeIn";

export function AdminGuard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">(() => {
    // Optimistic: if localStorage says admin, show content while verifying
    const role = localStorage.getItem("nps_user_role");
    return role === "admin" ? "loading" : "denied";
  });

  useEffect(() => {
    // Verify admin access by calling an admin-scoped endpoint
    adminHealth
      .detailed()
      .then(() => {
        setStatus("allowed");
        localStorage.setItem("nps_user_role", "admin");
      })
      .catch(() => {
        setStatus("denied");
        localStorage.removeItem("nps_user_role");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-[var(--nps-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <FadeIn delay={0}>
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-8 max-w-md w-full shadow-[0_0_24px_var(--nps-glass-glow)]">
            <div className="text-4xl mb-4 text-[var(--nps-text-dim)]">403</div>
            <h2 className="text-xl font-bold text-[var(--nps-text-bright)] mb-2">
              {t("admin.forbidden_title")}
            </h2>
            <p className="text-[var(--nps-text-dim)]">
              {t("admin.forbidden_message")}
            </p>
          </div>
        </FadeIn>
      </div>
    );
  }

  return <Outlet />;
}
