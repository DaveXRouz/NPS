import React, { useState, lazy, Suspense, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { QuestionReadingResult, QuestionCategory } from "@/types";
import { useSubmitQuestion } from "@/hooks/useOracleReadings";
import { useSessionForm } from "@/hooks/useSessionForm";
import { NumerologySystemSelector } from "./NumerologySystemSelector";
import type { NumerologySystem } from "@/utils/scriptDetector";

const PersianKeyboard = lazy(() =>
  import("./PersianKeyboard").then((m) => ({ default: m.PersianKeyboard })),
);

const MAX_QUESTION_LENGTH = 500;

const CATEGORIES: QuestionCategory[] = [
  "love",
  "career",
  "health",
  "finance",
  "family",
  "spiritual",
  "general",
];

function detectScript(text: string): "latin" | "persian" | "mixed" {
  const persianRegex = /[\u0600-\u06FF]/;
  const latinRegex = /[A-Za-z]/;
  const hasPersian = persianRegex.test(text);
  const hasLatin = latinRegex.test(text);
  if (hasPersian && !hasLatin) return "persian";
  if (hasLatin && !hasPersian) return "latin";
  if (hasPersian && hasLatin) return "mixed";
  return "latin";
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

interface QuestionReadingFormProps {
  userId?: number;
  onResult: (result: QuestionReadingResult) => void;
  onError?: (error: string) => void;
  abortControllerRef?: React.MutableRefObject<AbortController | null>;
}

export function QuestionReadingForm({
  userId,
  onResult,
  onError,
  abortControllerRef,
}: QuestionReadingFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "fa";

  const [question, setQuestion, clearQuestion] = useSessionForm<string>(
    "nps:question-form:question",
    "",
  );
  const [category, setCategory, clearCategory] =
    useSessionForm<QuestionCategory>("nps:question-form:category", "general");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [numerologySystem, setNumerologySystem] =
    useState<NumerologySystem>("auto");
  const [error, setError] = useState<string | null>(null);

  // Time of question — initialized to current time but captured fresh at submit
  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => new Date().getMinutes());
  const [second, setSecond] = useState(0);
  const [timeManuallySet, setTimeManuallySet] = useState(false);

  const mutation = useSubmitQuestion();

  const script = detectScript(question);
  const charCount = question.length;
  const charPercent = Math.round((charCount / MAX_QUESTION_LENGTH) * 100);
  const isNearLimit = charCount > MAX_QUESTION_LENGTH * 0.9;

  function handleUseCurrentTime() {
    const d = new Date();
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setSecond(d.getSeconds());
    setTimeManuallySet(false);
  }

  function handleKeyboardChar(char: string) {
    setQuestion((prev) => {
      if (prev.length >= MAX_QUESTION_LENGTH) return prev;
      return prev + char;
    });
  }

  function handleKeyboardBackspace() {
    setQuestion((prev) => prev.slice(0, -1));
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = question.trim();
      if (!trimmed) {
        const msg = t("oracle.error_question_empty");
        setError(msg);
        return;
      }
      if (trimmed.length < 10) {
        const msg = t("oracle.error_question_too_short");
        setError(msg);
        return;
      }

      setError(null);

      // Capture fresh time at submit if user hasn't manually adjusted
      if (!timeManuallySet) {
        const submitTime = new Date();
        setHour(submitTime.getHours());
        setMinute(submitTime.getMinutes());
        setSecond(submitTime.getSeconds());
      }

      // Create AbortController for this request
      const controller = new AbortController();
      if (abortControllerRef) {
        abortControllerRef.current = controller;
      }

      // NOTE: category and time are frontend-only for now.
      // Backend doesn't support these fields yet.
      mutation.mutate(
        {
          question: trimmed,
          userId,
          system: numerologySystem === "auto" ? "auto" : numerologySystem,
          signal: controller.signal,
        },
        {
          onSuccess: (data) => {
            clearQuestion();
            clearCategory();
            onResult(data);
          },
          onError: (err) => {
            // Silently ignore abort errors
            if (err instanceof DOMException && err.name === "AbortError")
              return;
            const msg =
              err instanceof Error ? err.message : t("oracle.error_submit");
            setError(msg);
            onError?.(msg);
          },
        },
      );
    },
    [
      question,
      userId,
      numerologySystem,
      timeManuallySet,
      mutation,
      onResult,
      onError,
      clearQuestion,
      clearCategory,
      abortControllerRef,
      t,
    ],
  );

  const scriptLabel =
    script === "persian"
      ? t("oracle.script_persian")
      : script === "mixed"
        ? t("oracle.script_mixed")
        : t("oracle.script_latin");

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteSecondOptions = Array.from({ length: 60 }, (_, i) => i);

  const selectClasses =
    "bg-[var(--nps-bg-input)] border border-[var(--nps-glass-border)] rounded-lg px-4 py-3 text-sm text-[var(--nps-text)] nps-input-focus transition-all duration-200 min-w-[72px] min-h-[44px]";

  const pillClasses = (selected: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full border transition-all duration-200 text-xs cursor-pointer min-h-[44px] ${
      selected
        ? "bg-[var(--nps-accent)] text-[var(--nps-bg)] border-[var(--nps-accent)] shadow-[0_0_8px_var(--nps-glass-glow)]"
        : "bg-[var(--nps-accent)]/10 text-[var(--nps-accent)] border-[var(--nps-accent)]/20 hover:bg-[var(--nps-accent)]/20"
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 text-start nps-animate-fade-in"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="question-reading-form"
    >
      <h3 className="text-lg font-semibold text-[var(--nps-text-bright)]">
        {t("oracle.question_reading_title")}
      </h3>

      {/* Section 1: Question Context */}
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--nps-accent)]"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-xs font-medium text-[var(--nps-text-dim)] uppercase tracking-wider">
            {t("oracle.section_question_context")}
          </span>
        </div>

        {/* Category pills */}
        <div>
          <label className="block text-xs text-[var(--nps-text-dim)] mb-2">
            {t("oracle.category_label")}
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={pillClasses(category === cat)}
                disabled={mutation.isPending}
                data-testid={`category-${cat}`}
              >
                {t(`oracle.category_${cat}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Time of question */}
        <div>
          <label className="block text-xs text-[var(--nps-text-dim)] mb-1.5">
            {t("oracle.time_of_question_label")}
          </label>
          <p className="text-xs text-[var(--nps-text-dim)] opacity-70 mb-2">
            {t("oracle.time_of_question_help")}
          </p>
          <div className="flex items-center gap-3 justify-center">
            <div className="flex flex-col">
              <label
                htmlFor="q-hour-select"
                className="text-xs text-[var(--nps-text-dim)] mb-1.5 text-center"
              >
                {t("oracle.hour_label")}
              </label>
              <select
                id="q-hour-select"
                aria-label={t("oracle.hour_label")}
                value={hour}
                onChange={(e) => {
                  setHour(Number(e.target.value));
                  setTimeManuallySet(true);
                }}
                className={selectClasses}
                disabled={mutation.isPending}
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}
                  </option>
                ))}
              </select>
            </div>
            <span className="mt-5 text-xl font-bold text-[var(--nps-accent)] opacity-60">
              :
            </span>
            <div className="flex flex-col">
              <label
                htmlFor="q-minute-select"
                className="text-xs text-[var(--nps-text-dim)] mb-1.5 text-center"
              >
                {t("oracle.minute_label")}
              </label>
              <select
                id="q-minute-select"
                aria-label={t("oracle.minute_label")}
                value={minute}
                onChange={(e) => {
                  setMinute(Number(e.target.value));
                  setTimeManuallySet(true);
                }}
                className={selectClasses}
                disabled={mutation.isPending}
              >
                {minuteSecondOptions.map((m) => (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                ))}
              </select>
            </div>
            <span className="mt-5 text-xl font-bold text-[var(--nps-accent)] opacity-60">
              :
            </span>
            <div className="flex flex-col">
              <label
                htmlFor="q-second-select"
                className="text-xs text-[var(--nps-text-dim)] mb-1.5 text-center"
              >
                {t("oracle.second_label")}
              </label>
              <select
                id="q-second-select"
                aria-label={t("oracle.second_label")}
                value={second}
                onChange={(e) => {
                  setSecond(Number(e.target.value));
                  setTimeManuallySet(true);
                }}
                className={selectClasses}
                disabled={mutation.isPending}
              >
                {minuteSecondOptions.map((s) => (
                  <option key={s} value={s}>
                    {pad2(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentTime}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 mt-3 rounded-full bg-[var(--nps-accent)]/10 text-[var(--nps-accent)] border border-[var(--nps-accent)]/20 hover:bg-[var(--nps-accent)]/20 transition-colors text-xs min-h-[44px]"
            disabled={mutation.isPending}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {t("oracle.use_current_time")}
          </button>
        </div>
      </div>

      {/* Section 2: Question Input */}
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--nps-accent)]"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-xs font-medium text-[var(--nps-text-dim)] uppercase tracking-wider">
            {t("oracle.section_question")}
          </span>
        </div>

        <div>
          <label
            htmlFor="question-input"
            className="block text-xs text-[var(--nps-text-dim)] mb-1.5"
          >
            {t("oracle.question_input_label")}
          </label>
          <div className="relative">
            <textarea
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("oracle.question_input_placeholder")}
              dir={script === "persian" ? "rtl" : "ltr"}
              rows={8}
              maxLength={MAX_QUESTION_LENGTH}
              className="w-full bg-[var(--nps-bg-input)] border border-[var(--nps-glass-border)] rounded-lg px-4 py-3 text-sm text-[var(--nps-text)] nps-input-focus transition-all duration-200 resize-y pe-10"
              disabled={mutation.isPending}
              data-testid="question-input"
            />
            <button
              type="button"
              onClick={() => setShowKeyboard(!showKeyboard)}
              className="absolute top-1 end-1 w-10 h-10 flex items-center justify-center text-[var(--nps-text-dim)] hover:text-[var(--nps-accent)] transition-colors rounded"
              aria-label={t("oracle.keyboard_toggle")}
              title={t("oracle.keyboard_persian")}
              data-testid="keyboard-toggle"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
              </svg>
            </button>
          </div>
          {showKeyboard && (
            <Suspense
              fallback={
                <div className="h-32 animate-pulse bg-[var(--nps-bg-input)] rounded-lg mt-2" />
              }
            >
              <PersianKeyboard
                onCharacterClick={handleKeyboardChar}
                onBackspace={handleKeyboardBackspace}
                onClose={() => setShowKeyboard(false)}
              />
            </Suspense>
          )}
        </div>

        {/* Character counter + script badge + progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span
              className={`px-2 py-0.5 rounded ${
                script === "persian"
                  ? "bg-[var(--nps-accent)]/20 text-[var(--nps-accent)]"
                  : "bg-[var(--nps-border)]/30 text-[var(--nps-text-dim)]"
              }`}
              data-testid="script-badge"
            >
              {t("oracle.detected_script", { script: scriptLabel })}
            </span>
            <span
              className={
                isNearLimit ? "text-nps-error" : "text-[var(--nps-text-dim)]"
              }
              data-testid="char-counter"
            >
              {t("oracle.question_char_count", {
                current: charCount,
                max: MAX_QUESTION_LENGTH,
              })}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--nps-border)] overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                charPercent < 80
                  ? "bg-[var(--nps-confidence-high)]"
                  : charPercent < 95
                    ? "bg-[var(--nps-confidence-medium)]"
                    : "bg-[var(--nps-confidence-low)]"
              }`}
              style={{ width: `${charPercent}%` }}
              role="progressbar"
              aria-valuenow={charPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("oracle.question_char_progress", {
                percent: charPercent,
              })}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Numerology System */}
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--nps-accent)]"
            aria-hidden="true"
            focusable="false"
          >
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
          <span className="text-xs font-medium text-[var(--nps-text-dim)] uppercase tracking-wider">
            {t("oracle.section_system")}
          </span>
        </div>
        <NumerologySystemSelector
          value={numerologySystem}
          onChange={setNumerologySystem}
          userName={question.slice(0, 50)}
          disabled={mutation.isPending}
        />
      </div>

      {/* Error display */}
      <div aria-live="polite">
        {error && (
          <p
            className="text-xs text-nps-error"
            role="alert"
            data-testid="question-error"
          >
            {error}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
        className="w-full rounded-lg bg-gradient-to-r from-[var(--nps-accent)] to-[var(--nps-accent-hover)] px-4 py-3 text-[var(--nps-bg)] font-medium nps-btn-lift disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
        data-testid="submit-question-reading"
      >
        {mutation.isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--nps-bg)] border-t-transparent" />
        )}
        {mutation.isPending
          ? t("oracle.generating_reading")
          : t("oracle.submit_question_reading")}
      </button>
    </form>
  );
}
