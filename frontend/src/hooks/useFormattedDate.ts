import { useTranslation } from "react-i18next";
import { useMemo, useCallback } from "react";
import { formatDate } from "../utils/dateFormatters";
import { formatPersianDate, toPersianNumber } from "../utils/persianFormatter";

export function useFormattedDate() {
  const { i18n } = useTranslation();
  const isPersian = i18n.language === "fa";
  const locale = isPersian ? "fa-IR" : "en-US";

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  /** Format ISO date string as a short date (e.g. "Feb 21, 2026" or Jalaali equivalent) */
  const format = useCallback(
    (isoDate: string): string => {
      if (isPersian) {
        return formatPersianDate(isoDate);
      }
      return formatDate(isoDate, "gregorian");
    },
    [isPersian],
  );

  /** Format date using Intl.DateTimeFormat for locale-aware short date */
  const formatDateLocale = useCallback(
    (dateStr: string): string => {
      try {
        return dateFormatter.format(new Date(dateStr));
      } catch {
        return dateStr;
      }
    },
    [dateFormatter],
  );

  /** Format date+time using Intl.DateTimeFormat for locale-aware datetime */
  const formatDateTime = useCallback(
    (dateStr: string): string => {
      try {
        return dateTimeFormatter.format(new Date(dateStr));
      } catch {
        return dateStr;
      }
    },
    [dateTimeFormatter],
  );

  /** Format relative time using Intl.RelativeTimeFormat */
  const formatRelativeTime = useCallback(
    (dateStr: string): string => {
      try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return rtf.format(-seconds, "second");
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return rtf.format(-minutes, "minute");
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return rtf.format(-hours, "hour");
        const days = Math.floor(hours / 24);
        if (days < 30) return rtf.format(-days, "day");
        const months = Math.floor(days / 30);
        if (months < 12) return rtf.format(-months, "month");
        return rtf.format(-Math.floor(months / 12), "year");
      } catch {
        return dateStr;
      }
    },
    [locale],
  );

  /** Legacy relative format (day-granularity only) */
  const formatRelative = useCallback(
    (isoDate: string): string => {
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
    },
    [isPersian],
  );

  return {
    format,
    formatDateLocale,
    formatDateTime,
    formatRelative,
    formatRelativeTime,
    isPersian,
    locale,
  };
}
