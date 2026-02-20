import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";

const READING_TYPES = ["time", "name", "question", "daily"] as const;

export function OracleSettingsSection() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const currentSettings = data?.settings ?? {};

  const save = useCallback(
    (key: string, value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateSettings({ [key]: value });
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }, 500);
    },
    [updateSettings],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const currentType = currentSettings.default_reading_type || "time";
  const autoDaily = currentSettings.auto_daily === "true";

  return (
    <div className="space-y-4">
      {/* Default Reading Type */}
      <div>
        <label className="text-xs text-nps-text-dim mb-1 block">
          {t("settings.default_reading_type")}
        </label>
        <select
          value={currentType}
          onChange={(e) => save("default_reading_type", e.target.value)}
          className="w-full px-3 py-2 text-sm bg-nps-bg-input border border-nps-border rounded text-nps-text-bright focus:outline-none focus:border-nps-accent"
        >
          {READING_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`dashboard.type_${type}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-daily Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-nps-text-bright">
            {t("settings.auto_daily")}
          </p>
          <p className="text-xs text-nps-text-dim">
            {t("settings.auto_daily_desc")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoDaily}
          onClick={() => save("auto_daily", autoDaily ? "false" : "true")}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            autoDaily ? "bg-nps-accent" : "bg-nps-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-nps-text-bright transition-transform ${
              autoDaily ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {saved && <p className="text-xs text-green-400">{t("settings.saved")}</p>}
    </div>
  );
}
