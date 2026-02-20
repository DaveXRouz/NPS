import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const isFA = i18n.language === "fa";

  function toggle() {
    const next = isFA ? "en" : "fa";
    i18n.changeLanguage(next);
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isFA}
      className="flex items-center gap-1 px-2 py-1 min-h-[44px] min-w-[44px] justify-center text-xs rounded-lg border border-[var(--nps-border)] hover:border-[var(--nps-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--nps-accent)] transition-colors duration-300 lg:min-h-0 lg:min-w-0"
      aria-label={t("accessibility.language_switch")}
      title={
        isFA ? t("layout.switch_to_english") : t("layout.switch_to_persian")
      }
    >
      <span
        className={
          isFA
            ? "text-[var(--nps-text-dim)]"
            : "text-[var(--nps-accent)] font-bold"
        }
      >
        EN
      </span>
      <span className="text-[var(--nps-text-dim)]">/</span>
      <span
        className={
          isFA
            ? "text-[var(--nps-accent)] font-bold"
            : "text-[var(--nps-text-dim)]"
        }
      >
        FA
      </span>
    </button>
  );
}
