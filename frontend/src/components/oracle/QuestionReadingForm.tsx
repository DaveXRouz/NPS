import { useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import type { QuestionReadingResult } from "@/types";
import { oracle } from "@/services/api";

const PersianKeyboard = lazy(() =>
  import("./PersianKeyboard").then((m) => ({ default: m.PersianKeyboard })),
);

const MAX_QUESTION_LENGTH = 500;

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

interface QuestionReadingFormProps {
  userId?: number;
  onResult: (result: QuestionReadingResult) => void;
  onError?: (error: string) => void;
}

export function QuestionReadingForm({
  userId,
  onResult,
  onError,
}: QuestionReadingFormProps) {
  const { t } = useTranslation();

  const [question, setQuestion] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const script = detectScript(question);
  const charCount = question.length;
  const isNearLimit = charCount > MAX_QUESTION_LENGTH * 0.9;

  function handleKeyboardChar(char: string) {
    setQuestion((prev) => {
      if (prev.length >= MAX_QUESTION_LENGTH) return prev;
      return prev + char;
    });
  }

  function handleKeyboardBackspace() {
    setQuestion((prev) => prev.slice(0, -1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = question.trim();
    if (!trimmed) {
      const msg = t("oracle.error_question_empty");
      setError(msg);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = await oracle.question(trimmed, userId, "auto");
      onResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("oracle.error_submit");
      setError(msg);
      onError?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const scriptLabel =
    script === "persian"
      ? t("oracle.script_persian")
      : script === "mixed"
        ? t("oracle.script_mixed")
        : t("oracle.script_latin");

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="question-reading-form"
    >
      <h3 className="text-sm font-medium text-nps-text">
        {t("oracle.question_reading_title")}
      </h3>

      {/* Question textarea with keyboard toggle */}
      <div className="relative">
        <label className="block text-sm text-nps-text-dim mb-1">
          {t("oracle.question_input_label")}
        </label>
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("oracle.question_input_placeholder")}
            dir={script === "persian" ? "rtl" : "ltr"}
            rows={5}
            maxLength={MAX_QUESTION_LENGTH}
            className="w-full bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent resize-y pe-10"
            data-testid="question-input"
          />
          <button
            type="button"
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="absolute top-2 end-2 w-7 h-7 flex items-center justify-center text-nps-text-dim hover:text-nps-oracle-accent transition-colors rounded"
            aria-label={t("oracle.keyboard_toggle")}
            title={t("oracle.keyboard_persian")}
            data-testid="keyboard-toggle"
          >
            ⌨
          </button>
        </div>
        {showKeyboard && (
          <Suspense
            fallback={
              <div className="h-32 animate-pulse bg-nps-bg-input rounded mt-1" />
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

      {/* Character counter + script badge */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={`px-2 py-0.5 rounded ${
            script === "persian"
              ? "bg-nps-oracle-accent/20 text-nps-oracle-accent"
              : "bg-nps-border/30 text-nps-text-dim"
          }`}
          data-testid="script-badge"
        >
          {t("oracle.detected_script", { script: scriptLabel })}
        </span>
        <span
          className={`${isNearLimit ? "text-nps-bg-danger" : "text-nps-text-dim"}`}
          data-testid="char-counter"
        >
          {t("oracle.char_count", {
            current: charCount,
            max: MAX_QUESTION_LENGTH,
          })}
        </span>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full px-4 py-2 text-sm bg-nps-oracle-accent text-nps-bg font-medium rounded hover:bg-nps-oracle-accent/80 transition-colors disabled:opacity-50"
        data-testid="submit-question-reading"
      >
        {isSubmitting
          ? t("common.loading")
          : t("oracle.submit_question_reading")}
      </button>

      <div aria-live="polite">
        {error && (
          <p
            className="text-xs text-nps-bg-danger"
            role="alert"
            data-testid="question-error"
          >
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
