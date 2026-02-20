import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Sets the document title to "NPS — <pageKey translation>".
 * Restores the default title on unmount.
 */
export function usePageTitle(pageKey: string) {
  const { t } = useTranslation();
  useEffect(() => {
    const prev = document.title;
    document.title = `NPS — ${t(pageKey)}`;
    return () => {
      document.title = prev;
    };
  }, [t, pageKey]);
}
