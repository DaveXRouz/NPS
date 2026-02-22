import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  type CalendarMode,
  formatDate,
  buildCalendarGrid,
  isoToJalaali,
  todayIso,
  JALAALI_MONTHS,
  JALAALI_WEEKDAYS,
  GREGORIAN_MONTHS,
  GREGORIAN_WEEKDAYS,
} from "@/utils/dateFormatters";

type ViewMode = "days" | "months" | "years";

interface CalendarPickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (isoDate: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
}

const GREGORIAN_MIN_YEAR = 1920;
const JALAALI_MIN_YEAR = 1300;

export function CalendarPicker({
  value,
  onChange,
  label,
  error,
  required,
}: CalendarPickerProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CalendarMode>(() => {
    const saved = localStorage.getItem("nps_calendar_mode");
    if (saved === "gregorian" || saved === "jalaali") return saved;
    return i18n.language === "fa" ? "jalaali" : "gregorian";
  });
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const containerRef = useRef<HTMLDivElement>(null);

  // Current view year/month — derived from value or today
  const today = todayIso();
  const initDate = value || today;

  const [viewYear, setViewYear] = useState(() => {
    if (mode === "jalaali") {
      return isoToJalaali(initDate).jy;
    }
    return parseInt(initDate.split("-")[0]);
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (mode === "jalaali") {
      return isoToJalaali(initDate).jm;
    }
    return parseInt(initDate.split("-")[1]);
  });

  // Compute max year for current mode
  const currentGregorianYear = new Date().getFullYear();
  const currentJalaaliYear = isoToJalaali(today).jy;
  const minYear = mode === "jalaali" ? JALAALI_MIN_YEAR : GREGORIAN_MIN_YEAR;
  const maxYear =
    mode === "jalaali" ? currentJalaaliYear + 1 : currentGregorianYear + 1;

  // Persist calendar mode preference
  useEffect(() => {
    localStorage.setItem("nps_calendar_mode", mode);
  }, [mode]);

  // Reset view when mode changes
  useEffect(() => {
    const ref = value || today;
    if (mode === "jalaali") {
      const j = isoToJalaali(ref);
      setViewYear(j.jy);
      setViewMonth(j.jm);
    } else {
      setViewYear(parseInt(ref.split("-")[0]));
      setViewMonth(parseInt(ref.split("-")[1]));
    }
    setViewMode("days");
  }, [mode, value, today]);

  const handleCalendarKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleCalendarKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleCalendarKeyDown);
    };
  }, [isOpen, handleCalendarKeyDown]);

  function handlePrevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(iso: string) {
    onChange(iso);
    setIsOpen(false);
  }

  // Year grid: 12 years centered around viewYear
  const yearRangeStart = viewYear - (viewYear % 12);
  const yearRangeEnd = yearRangeStart + 11;
  const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

  function handlePrevYearRange() {
    const newStart = yearRangeStart - 12;
    if (newStart >= minYear - 11) {
      setViewYear(newStart);
    }
  }

  function handleNextYearRange() {
    const newStart = yearRangeStart + 12;
    if (newStart <= maxYear) {
      setViewYear(newStart);
    }
  }

  function handleYearClick(year: number) {
    setViewYear(year);
    setViewMode("months");
  }

  function handleMonthClick(month: number) {
    setViewMonth(month);
    setViewMode("days");
  }

  // Determine "current" and "selected" year/month for highlighting
  const todayYear =
    mode === "jalaali" ? currentJalaaliYear : currentGregorianYear;
  const todayMonth =
    mode === "jalaali" ? isoToJalaali(today).jm : new Date().getMonth() + 1;

  const selectedYear = value
    ? mode === "jalaali"
      ? isoToJalaali(value).jy
      : parseInt(value.split("-")[0])
    : null;
  const selectedMonth = value
    ? mode === "jalaali"
      ? isoToJalaali(value).jm
      : parseInt(value.split("-")[1])
    : null;

  const grid = buildCalendarGrid(viewYear, viewMonth, mode);
  const weekdays = mode === "jalaali" ? JALAALI_WEEKDAYS : GREGORIAN_WEEKDAYS;
  const monthName =
    mode === "jalaali"
      ? JALAALI_MONTHS[viewMonth - 1]
      : GREGORIAN_MONTHS[viewMonth - 1];

  const months =
    mode === "jalaali"
      ? JALAALI_MONTHS
      : GREGORIAN_MONTHS.map((m) => m.slice(0, 3));

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm text-nps-text-dim mb-1">
          {label}
          {required && (
            <span aria-hidden="true" className="text-nps-error ms-1">
              *
            </span>
          )}
        </label>
      )}

      {/* Display input */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-describedby={error ? "calendar-error" : undefined}
        className={`w-full text-start bg-nps-bg-input border rounded px-3 py-2 text-sm text-nps-text nps-input-focus ${
          error ? "border-nps-error" : "border-nps-border"
        }`}
      >
        {value ? formatDate(value, mode) : t("oracle.calendar_select_date")}
      </button>

      {error && (
        <p
          id="calendar-error"
          className="text-nps-error text-xs mt-1"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Dropdown calendar */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t("a11y.calendar_dialog")}
          className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:bottom-auto sm:start-0 sm:top-full sm:mt-1 z-50 bg-nps-bg-card border border-nps-oracle-border rounded-t-lg sm:rounded-lg p-3 shadow-lg w-full sm:w-72"
        >
          {/* Calendar mode toggle */}
          <div className="flex gap-1 mb-3">
            <button
              type="button"
              onClick={() => setMode("gregorian")}
              className={`flex-1 text-xs py-1 min-h-[44px] sm:min-h-0 rounded transition-colors ${
                mode === "gregorian"
                  ? "bg-nps-oracle-accent text-nps-bg font-medium"
                  : "bg-nps-bg-input text-nps-text-dim hover:text-nps-text"
              }`}
            >
              {t("oracle.calendar_gregorian")}
            </button>
            <button
              type="button"
              onClick={() => setMode("jalaali")}
              className={`flex-1 text-xs py-1 min-h-[44px] sm:min-h-0 rounded transition-colors ${
                mode === "jalaali"
                  ? "bg-nps-oracle-accent text-nps-bg font-medium"
                  : "bg-nps-bg-input text-nps-text-dim hover:text-nps-text"
              }`}
            >
              {t("oracle.calendar_jalaali")}
            </button>
          </div>

          {viewMode === "years" && (
            <>
              {/* Year range navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={handlePrevYearRange}
                  className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center text-nps-text-dim hover:text-nps-text rounded transition-colors"
                  aria-label={t("oracle.calendar_select_year")}
                >
                  ‹
                </button>
                <span className="text-sm font-medium text-nps-text">
                  {yearRangeStart} – {yearRangeEnd}
                </span>
                <button
                  type="button"
                  onClick={handleNextYearRange}
                  className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center text-nps-text-dim hover:text-nps-text rounded transition-colors"
                  aria-label={t("oracle.calendar_select_year")}
                >
                  ›
                </button>
              </div>

              {/* Year grid */}
              <div
                className="grid grid-cols-3 gap-1"
                dir={mode === "jalaali" ? "rtl" : "ltr"}
              >
                {years.map((year) => {
                  const isCurrentYear = year === todayYear;
                  const isSelectedYear =
                    selectedYear !== null &&
                    year === selectedYear &&
                    selectedYear === viewYear;
                  const outOfRange = year < minYear || year > maxYear;
                  return (
                    <button
                      key={year}
                      type="button"
                      disabled={outOfRange}
                      onClick={() => handleYearClick(year)}
                      className={`w-full py-3 min-h-[44px] text-sm rounded transition-colors cursor-pointer ${
                        outOfRange
                          ? "text-nps-text-dim/40 cursor-not-allowed"
                          : isSelectedYear
                            ? "bg-nps-oracle-accent text-nps-bg font-bold"
                            : isCurrentYear
                              ? "bg-nps-oracle-accent/20 text-nps-oracle-accent font-medium"
                              : "text-nps-text hover:bg-nps-bg-hover"
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === "months" && (
            <>
              {/* Month view header — click to go back to years */}
              <div className="flex items-center justify-center mb-2">
                <button
                  type="button"
                  onClick={() => setViewMode("years")}
                  className="text-sm font-medium text-nps-text hover:text-nps-oracle-accent transition-colors cursor-pointer"
                >
                  {viewYear}
                </button>
              </div>

              {/* Month grid */}
              <div
                className="grid grid-cols-3 gap-1"
                dir={mode === "jalaali" ? "rtl" : "ltr"}
              >
                {months.map((name, i) => {
                  const month = i + 1;
                  const isCurrentMonth =
                    viewYear === todayYear && month === todayMonth;
                  const isSelectedMonth =
                    selectedYear !== null &&
                    viewYear === selectedYear &&
                    selectedMonth !== null &&
                    month === selectedMonth;
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => handleMonthClick(month)}
                      className={`w-full py-3 min-h-[44px] text-sm rounded transition-colors cursor-pointer ${
                        isSelectedMonth
                          ? "bg-nps-oracle-accent text-nps-bg font-bold"
                          : isCurrentMonth
                            ? "bg-nps-oracle-accent/20 text-nps-oracle-accent font-medium"
                            : "text-nps-text hover:bg-nps-bg-hover"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === "days" && (
            <>
              {/* Month/year navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center text-nps-text-dim hover:text-nps-text rounded transition-colors"
                  aria-label={t("a11y.previous_month")}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("years")}
                  className="text-sm font-medium text-nps-text hover:text-nps-oracle-accent transition-colors cursor-pointer"
                >
                  {monthName} {viewYear}
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center text-nps-text-dim hover:text-nps-text rounded transition-colors"
                  aria-label={t("a11y.next_month")}
                >
                  ›
                </button>
              </div>

              {/* Weekday header */}
              <div
                className="grid grid-cols-7 gap-0.5 mb-1"
                dir={mode === "jalaali" ? "rtl" : "ltr"}
              >
                {weekdays.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs text-nps-text-dim py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div role="grid" dir={mode === "jalaali" ? "rtl" : "ltr"}>
                {grid.map((week, wi) => (
                  <div key={wi} role="row" className="grid grid-cols-7 gap-0.5">
                    {week.map((cell, ci) => {
                      const isSelected = cell.iso === value;
                      const isToday = cell.iso === today;
                      return (
                        <div key={ci} role="gridcell">
                          <button
                            type="button"
                            onClick={() => handleDayClick(cell.iso)}
                            aria-label={formatDate(cell.iso, mode)}
                            aria-selected={isSelected}
                            aria-current={isToday ? "date" : undefined}
                            className={`w-full h-10 sm:h-8 text-xs rounded transition-colors ${
                              isSelected
                                ? "bg-nps-oracle-accent text-nps-bg font-bold"
                                : isToday
                                  ? "bg-nps-oracle-accent/20 text-nps-oracle-accent font-medium"
                                  : cell.isCurrentMonth
                                    ? "text-nps-text hover:bg-nps-bg-hover"
                                    : "text-nps-text-dim/40 hover:bg-nps-bg-hover"
                            }`}
                          >
                            {cell.day}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
