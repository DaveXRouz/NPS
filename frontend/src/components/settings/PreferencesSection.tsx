import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";

const TIMEZONES = [
  "UTC",
  "Asia/Tehran",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Australia/Sydney",
];

export function PreferencesSection() {
  const { t, i18n } = useTranslation();
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

  const currentLocale = currentSettings.locale || i18n.language || "en";
  const currentTheme = currentSettings.theme || "dark";
  const currentTimezone =
    currentSettings.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentSystem = currentSettings.numerology_system || "pythagorean";

  const handleLocaleChange = (locale: string) => {
    i18n.changeLanguage(locale);
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
    save("locale", locale);
  };

  return (
    <div className="space-y-4">
      {/* Language */}
      <div>
        <label className="text-xs text-nps-text-dim mb-1 block">
          {t("settings.language")}
        </label>
        <div className="flex gap-2">
          {["en", "fa"].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLocaleChange(lang)}
              className={`px-4 py-1.5 text-sm rounded border transition-colors ${
                currentLocale === lang
                  ? "bg-nps-accent text-white border-nps-accent"
                  : "bg-nps-bg-card text-nps-text-dim border-nps-border hover:border-nps-accent"
              }`}
            >
              {lang === "en" ? "English" : "فارسی"}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="text-xs text-nps-text-dim mb-1 block">
          {t("settings.theme")}
        </label>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => save("theme", theme)}
              className={`px-4 py-1.5 text-sm rounded border transition-colors ${
                currentTheme === theme
                  ? "bg-nps-accent text-white border-nps-accent"
                  : "bg-nps-bg-card text-nps-text-dim border-nps-border hover:border-nps-accent"
              }`}
            >
              {t(`settings.theme_${theme}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="text-xs text-nps-text-dim mb-1 block">
          {t("settings.timezone")}
        </label>
        <select
          value={currentTimezone}
          onChange={(e) => save("timezone", e.target.value)}
          className="w-full px-3 py-2 text-sm bg-nps-bg-input border border-nps-border rounded text-nps-text-bright focus:outline-none focus:border-nps-accent"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {/* Numerology System */}
      <div>
        <label className="text-xs text-nps-text-dim mb-1 block">
          {t("settings.numerology_system")}
        </label>
        <div className="flex gap-2 flex-wrap">
          {(["pythagorean", "chaldean", "abjad"] as const).map((sys) => (
            <button
              key={sys}
              type="button"
              onClick={() => save("numerology_system", sys)}
              className={`px-4 py-1.5 text-sm rounded border transition-colors ${
                currentSystem === sys
                  ? "bg-nps-accent text-white border-nps-accent"
                  : "bg-nps-bg-card text-nps-text-dim border-nps-border hover:border-nps-accent"
              }`}
            >
              {t(`settings.numerology_${sys}`)}
            </button>
          ))}
        </div>
      </div>

      {saved && <p className="text-xs text-green-400">{t("settings.saved")}</p>}
    </div>
  );
}
