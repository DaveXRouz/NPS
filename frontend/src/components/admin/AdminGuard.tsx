import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthUser } from "@/hooks/useAuthUser";
import { FadeIn } from "@/components/common/FadeIn";

export function AdminGuard() {
  const { t } = useTranslation();
  const { isAdmin, isLoading } = useAuthUser();

  // Show nothing until server verification completes — no optimistic UI
  if (isLoading) {
    return null;
  }

  if (!isAdmin) {
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
