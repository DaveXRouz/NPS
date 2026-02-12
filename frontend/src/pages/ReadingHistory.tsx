import { useTranslation } from "react-i18next";

export function ReadingHistory() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--nps-text-bright)]">
        {t("nav.history")}
      </h2>
      <div className="bg-[var(--nps-bg-card)] border border-[var(--nps-border)] rounded-lg p-6 text-center">
        <p className="text-[var(--nps-text-dim)]">
          Reading History page coming in Session 21.
        </p>
      </div>
    </div>
  );
}

export default ReadingHistory;
