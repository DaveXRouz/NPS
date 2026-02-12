import { useTranslation } from "react-i18next";
import { formatDate } from "../utils/dateFormatters";
import { formatPersianDate, toPersianNumber } from "../utils/persianFormatter";

export function useFormattedDate() {
  const { i18n } = useTranslation();
  const isPersian = i18n.language === "fa";

  const format = (isoDate: string): string => {
    if (isPersian) {
      return formatPersianDate(isoDate);
    }
    return formatDate(isoDate, "gregorian");
  };

  const formatRelative = (isoDate: string): string => {
    const now = new Date();
    const date = new Date(isoDate);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (isPersian) {
      if (diffDays === 0) return "\u0627\u0645\u0631\u0648\u0632";
      if (diffDays === 1) return "\u062f\u06cc\u0631\u0648\u0632";
      return `${toPersianNumber(diffDays)} \u0631\u0648\u0632 \u067e\u06cc\u0634`;
    }
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  return { format, formatRelative, isPersian };
}
