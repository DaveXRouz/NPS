import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { useOracleInquiry } from "@/hooks/useOracleInquiry";
import { FadeIn } from "@/components/common/FadeIn";
import InquiryOptionCard from "./InquiryOptionCard";

interface OracleInquiryProps {
  readingType: "question" | "name" | "time" | "daily";
  onComplete: (context: Record<string, string>) => void;
  onCancel: () => void;
}

export default function OracleInquiry({
  readingType,
  onComplete,
  onCancel,
}: OracleInquiryProps) {
  const { t } = useTranslation();
  const { dir, isRTL } = useDirection();

  const {
    questions,
    currentIndex,
    currentQuestion,
    currentAnswer,
    selectOption,
    setFreeText,
    skipQuestion,
    next,
    back,
    isComplete,
    getInquiryContext,
  } = useOracleInquiry(readingType);

  // Auto-submit when all questions answered
  useEffect(() => {
    if (isComplete) {
      onComplete(getInquiryContext());
    }
  }, [isComplete, onComplete, getInquiryContext]);

  const handleContinue = useCallback(() => {
    next();
  }, [next]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [onCancel],
  );

  if (!currentQuestion || isComplete) return null;

  const hasAnswer =
    currentAnswer &&
    !currentAnswer.skipped &&
    (currentAnswer.selectedOptionId !== null ||
      (currentAnswer.freeText !== null && currentAnswer.freeText.length > 0));

  return (
    <div
      dir={dir}
      className="space-y-4"
      role="dialog"
      aria-label={t("oracle.inquiry_continue")}
      onKeyDown={handleKeyDown}
      data-testid="oracle-inquiry"
    >
      {/* Progress dots + skip */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemax={questions.length}
        >
          {questions.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i <= currentIndex ? "bg-[var(--nps-accent)]" : "bg-nps-bg-hover"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-nps-text-dim hover:text-nps-text transition-colors"
        >
          {t("oracle.inquiry_cancel")}
        </button>
      </div>

      {/* Question prompt */}
      <FadeIn key={currentQuestion.id} direction="up">
        <p className="text-base italic text-[var(--nps-accent)] font-medium leading-relaxed">
          {t(currentQuestion.promptKey)}
        </p>
      </FadeIn>

      {/* Option cards - 2 column grid */}
      <FadeIn key={`opts-${currentQuestion.id}`} delay={100} direction="up">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          role="radiogroup"
          aria-label={t(currentQuestion.promptKey)}
        >
          {currentQuestion.options.map((option) => (
            <InquiryOptionCard
              key={option.id}
              emoji={option.emoji}
              labelKey={option.labelKey}
              descKey={option.descKey}
              selected={currentAnswer?.selectedOptionId === option.id}
              onSelect={() => selectOption(option.id)}
            />
          ))}
        </div>
      </FadeIn>

      {/* Free text input */}
      {currentQuestion.allowFreeText && (
        <FadeIn delay={200} direction="up">
          <div className="space-y-2">
            <p className="text-xs text-nps-text-dim text-center">
              {t("oracle.inquiry_or_divider")}
            </p>
            <textarea
              value={currentAnswer?.freeText ?? ""}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={t(currentQuestion.freeTextPlaceholderKey)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-nps-bg-input border border-nps-border rounded-lg text-nps-text placeholder:text-nps-text-dim/50 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--nps-accent)]/50"
            />
          </div>
        </FadeIn>
      )}

      {/* Navigation */}
      <div
        className={`flex items-center ${isRTL ? "flex-row-reverse" : ""} justify-between pt-2`}
      >
        <div>
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={back}
              className="text-sm text-nps-text-dim hover:text-nps-text transition-colors"
            >
              {t("oracle.inquiry_back")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={skipQuestion}
            className="text-sm text-nps-text-dim hover:text-nps-text transition-colors"
          >
            {t("oracle.inquiry_skip")}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!hasAnswer}
            className={`
              px-4 py-1.5 text-sm rounded-lg transition-colors
              ${
                hasAnswer
                  ? "bg-[var(--nps-accent)] text-[var(--nps-bg)] hover:bg-[var(--nps-accent-hover)]"
                  : "bg-nps-bg-hover text-nps-text-dim cursor-not-allowed"
              }
            `}
          >
            {t("oracle.inquiry_continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
