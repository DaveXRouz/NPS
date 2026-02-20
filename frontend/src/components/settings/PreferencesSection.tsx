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
              className={`px-4 py-1.5 text-sm rounded-lg border transition-all duration-300 ${
                currentLocale === lang
                  ? "bg-[var(--nps-accent)] text-white border-[var(--nps-accent)]"
                  : "bg-[var(--nps-glass-bg)] text-[var(--nps-text-dim)] border-[var(--nps-glass-border)] hover:border-[var(--nps-accent)]"
              }`}
            >
              {lang === "en"
                ? t("settings.lang_english")
                : t("settings.lang_persian")}
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
              className={`px-4 py-1.5 text-sm rounded-lg border transition-all duration-300 ${
                currentTheme === theme
                  ? "bg-[var(--nps-accent)] text-white border-[var(--nps-accent)]"
                  : "bg-[var(--nps-glass-bg)] text-[var(--nps-text-dim)] border-[var(--nps-glass-border)] hover:border-[var(--nps-accent)]"
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
          className="nps-input-focus w-full px-3 py-2 text-sm bg-[var(--nps-bg-input)] border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text-bright)] transition-all duration-300"
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
              className={`px-4 py-1.5 text-sm rounded-lg border transition-all duration-300 ${
                currentSystem === sys
                  ? "bg-[var(--nps-accent)] text-white border-[var(--nps-accent)]"
                  : "bg-[var(--nps-glass-bg)] text-[var(--nps-text-dim)] border-[var(--nps-glass-border)] hover:border-[var(--nps-accent)]"
              }`}
            >
              {t(`settings.numerology_${sys}`)}
            </button>
          ))}
        </div>
      </div>

      {saved && (
        <p className="text-xs" style={{ color: "var(--nps-status-healthy)" }}>
          {t("settings.saved")}
        </p>
      )}
    </div>
  );
}
