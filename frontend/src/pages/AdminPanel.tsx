import { useTranslation } from "react-i18next";

export function AdminPanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--nps-text-bright)]">
        {t("nav.admin")}
      </h2>
      <div className="bg-[var(--nps-bg-card)] border border-[var(--nps-border)] rounded-lg p-6 text-center">
        <p className="text-[var(--nps-text-dim)]">
          Admin Panel coming in Session 38.
        </p>
      </div>
    </div>
  );
}

export default AdminPanel;
