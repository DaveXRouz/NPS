import { useTranslation } from "react-i18next";

export default function Scanner() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-nps-text-bright">
        {t("scanner.title")}
      </h2>

      <div className="bg-nps-bg-card border border-nps-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-nps-text mb-4">
          {t("scanner.config_title")}
        </h3>
        <p className="text-nps-text-dim text-sm">{t("scanner.config_desc")}</p>
      </div>
    </div>
  );
}
