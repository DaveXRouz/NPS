import { useTranslation } from "react-i18next";

export default function Vault() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-nps-text-bright">
        {t("vault.title")}
      </h2>

      <div className="bg-nps-bg-card border border-nps-border rounded-lg p-4">
        <p className="text-nps-text-dim text-sm">{t("vault.description")}</p>
      </div>
    </div>
  );
}
