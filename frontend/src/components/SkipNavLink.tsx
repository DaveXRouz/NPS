import { useTranslation } from "react-i18next";

export function SkipNavLink() {
  const { t } = useTranslation();

  return (
    <a href="#main-content" className="skip-nav">
      {t("a11y.skip_to_content")}
    </a>
  );
}
