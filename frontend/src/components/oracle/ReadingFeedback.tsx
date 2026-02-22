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
        className="mt-4 p-4 bg-nps-success/10 border border-nps-success/30 rounded text-center"
        data-testid="feedback-thank-you"
      >
        <p className="text-nps-success text-sm font-medium">
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
                    ? "bg-nps-success text-nps-text-bright"
                    : "bg-nps-bg hover:bg-nps-success/20 text-nps-text-dim"
                }`}
                aria-label={`${t(SECTION_I18N[section] || section)} ${t("feedback.helpful")}`}
                data-testid={`thumb-up-${section}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleSectionToggle(section, false)}
                className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                  sectionFeedback[section] === false
                    ? "bg-nps-error text-nps-text-bright"
                    : "bg-nps-bg hover:bg-nps-error/20 text-nps-text-dim"
                }`}
                aria-label={`${t(SECTION_I18N[section] || section)} ${t("feedback.not_helpful")}`}
                data-testid={`thumb-down-${section}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
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
          className="text-xs text-nps-text-dim text-end"
          data-testid="feedback-counter"
        >
          {t("feedback.text_counter", { count: textFeedback.length })}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-nps-error" data-testid="feedback-error">
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
