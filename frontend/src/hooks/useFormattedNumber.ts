import { useTranslation } from "react-i18next";
import { toPersianNumber } from "../utils/persianFormatter";

export function useFormattedNumber() {
  const { i18n } = useTranslation();
  const isPersian = i18n.language === "fa";

  const formatNumber = (n: number): string => {
    if (isPersian) {
      return toPersianNumber(n);
    }
    return n.toLocaleString("en-US");
  };

  const formatPercent = (n: number): string => {
    const formatted = isPersian ? toPersianNumber(n) : n.toString();
    return isPersian ? `${formatted}٪` : `${formatted}%`;
  };

  const formatScore = (n: number, max: number = 100): string => {
    const formatted = formatNumber(n);
    const formattedMax = formatNumber(max);
    return `${formatted}/${formattedMax}`;
  };

  return { formatNumber, formatPercent, formatScore, isPersian };
}
