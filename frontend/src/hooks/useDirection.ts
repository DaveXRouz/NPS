import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface DirectionInfo {
  dir: "ltr" | "rtl";
  isRTL: boolean;
  locale: string;
}

/**
 * Single source of truth for text direction.
 * Components must use this hook instead of checking i18n.language directly.
 */
export function useDirection(): DirectionInfo {
  const { i18n } = useTranslation();

  return useMemo(
    () => ({
      dir: i18n.language === "fa" ? ("rtl" as const) : ("ltr" as const),
      isRTL: i18n.language === "fa",
      locale: i18n.language,
    }),
    [i18n.language],
  );
}
