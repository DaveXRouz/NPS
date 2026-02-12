import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { StarRating } from "./StarRating";
import * as api from "@/services/api";
import type { FeedbackRequest } from "@/types";

interface ReadingFeedbackProps {
  readingId: number;
  sections?: string[];
  onSubmitted?: () => void;
}

const DEFAULT_SECTIONS = [
  "simple",
  "advice",
  "action_steps",
  "universe_message",
];

const SECTION_I18N: Record<string, string> = {
  simple: "feedback.sections.simple",
  advice: "feedback.sections.advice",
  action_steps: "feedback.sections.action_steps",
  universe_message: "feedback.sections.universe_message",
};

export function ReadingFeedback({
  readingId,
  sections = DEFAULT_SECTIONS,
  onSubmitted,
}: ReadingFeedbackProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [sectionFeedback, setSectionFeedback] = useState<
    Record<string, boolean | null>
  >({});
  const [textFeedback, setTextFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSectionToggle = useCallback(
    (section: string, helpful: boolean) => {
      setSectionFeedback((prev) => {
        const current = prev[section];
        // Toggle off if already set to the same value
        if (current === helpful) {
          const next = { ...prev };
          delete next[section];
          return next;
        }
        return { ...prev, [section]: helpful };
      });
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    setError(null);

    const feedbackData: FeedbackRequest = {
      rating,
      section_feedback: Object.entries(sectionFeedback)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([section, helpful]) => ({
          section,
          helpful: helpful as boolean,
        })),
      text_feedback: textFeedback.trim() || undefined,
    };

    try {
      await api.learning.feedback.submit(readingId, feedbackData);
      setIsSubmitted(true);
      onSubmitted?.();
    } catch {
      setError(t("feedback.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, sectionFeedback, textFeedback, readingId, onSubmitted, t]);

  if (isSubmitted) {
    return (
      <div
        className="mt-4 p-4 bg-green-900/20 border border-green-700/30 rounded text-center"
        data-testid="feedback-thank-you"
      >
        <p className="text-green-400 text-sm font-medium">
          {t("feedback.thank_you")}
        </p>
        <div className="mt-1">
          <StarRating value={rating} readonly size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-4 p-4 bg-nps-bg-card border border-nps-border/30 rounded space-y-3"
      aria-describedby="feedback-instructions"
      data-testid="feedback-form"
    >
      <p id="feedback-instructions" className="text-xs text-nps-text-dim">
        {t("feedback.rate_reading")}
      </p>

      {/* Star rating */}
      <div className="flex items-center gap-2">
        <StarRating value={rating} onChange={setRating} size="lg" />
        {rating > 0 && (
          <span className="text-xs text-nps-text-dim">{rating}/5</span>
        )}
      </div>

      {/* Section thumbs */}
      <div className="space-y-1.5">
        <p className="text-xs text-nps-text-dim">
          {t("feedback.section_feedback")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {sections.map((section) => (
            <div key={section} className="flex items-center gap-1 text-xs">
              <span className="text-nps-text-dim flex-1 truncate">
                {t(SECTION_I18N[section] || section)}
              </span>
              <button
                type="button"
                onClick={() => handleSectionToggle(section, true)}
                className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                  sectionFeedback[section] === true
                    ? "bg-green-700 text-green-100"
                    : "bg-nps-bg hover:bg-green-900/30 text-nps-text-dim"
                }`}
                aria-label={`${t(SECTION_I18N[section] || section)} ${t("feedback.helpful")}`}
                data-testid={`thumb-up-${section}`}
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => handleSectionToggle(section, false)}
                className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                  sectionFeedback[section] === false
                    ? "bg-red-700 text-red-100"
                    : "bg-nps-bg hover:bg-red-900/30 text-nps-text-dim"
                }`}
                aria-label={`${t(SECTION_I18N[section] || section)} ${t("feedback.not_helpful")}`}
                data-testid={`thumb-down-${section}`}
              >
                👎
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Text feedback */}
      <div>
        <textarea
          value={textFeedback}
          onChange={(e) => setTextFeedback(e.target.value.slice(0, 1000))}
          placeholder={t("feedback.text_placeholder")}
          maxLength={1000}
          rows={3}
          className="w-full bg-nps-bg border border-nps-border/30 rounded p-2 text-xs text-nps-text placeholder-nps-text-dim/50 resize-none"
          data-testid="feedback-text"
        />
        <p
          className="text-xs text-nps-text-dim text-right"
          data-testid="feedback-counter"
        >
          {t("feedback.text_counter", { count: textFeedback.length })}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400" data-testid="feedback-error">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="w-full py-2 text-xs font-medium rounded transition-colors bg-nps-oracle-accent text-nps-bg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="feedback-submit"
      >
        {isSubmitting ? t("feedback.submitting") : t("feedback.submit")}
      </button>
    </div>
  );
}
