import { useState } from "react";
import { useTranslation } from "react-i18next";
import { translation } from "@/services/api";
import { formatAiInterpretation } from "@/utils/formatAiInterpretation";

interface TranslatedReadingProps {
  reading: string;
}

function InterpretationBody({ text }: { text: string }) {
  const sections = formatAiInterpretation(text);

  if (sections.length === 0) return <p>{text}</p>;

  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div key={i}>
          {i > 0 && !section.heading && sections.length > 2 && (
            <div className="border-t border-[var(--nps-border)]/30 mb-4" />
          )}
          {section.heading && (
            <h4 className="text-xs font-semibold text-[var(--nps-accent)] mb-1">
              {section.heading}
            </h4>
          )}
          {section.body &&
            section.body.split("\n\n").map((paragraph, j) => (
              <p key={j} className="leading-relaxed mb-2 last:mb-0">
                {paragraph}
              </p>
            ))}
        </div>
      ))}
    </div>
  );
}

export function TranslatedReading({ reading }: TranslatedReadingProps) {
  const { t } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  async function handleTranslate() {
    setIsTranslating(true);
    setError(null);
    try {
      const result = await translation.translate(reading, "en", "fa");
      setTranslatedText(result.translated_text);
      setShowTranslation(true);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 502) {
        setError(
          t(
            "oracle.translate_unavailable",
            "Translation service is temporarily unavailable.",
          ),
        );
      } else {
        setError(t("oracle.translate_error"));
      }
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Reading content */}
      <div
        aria-live="polite"
        className={`text-sm text-nps-text ${translatedText && !showTranslation ? "opacity-60" : ""}`}
      >
        {showTranslation && translatedText ? (
          <div dir="rtl" lang="fa" className="font-[Vazirmatn]">
            <InterpretationBody text={translatedText} />
          </div>
        ) : (
          <InterpretationBody text={reading} />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!translatedText && (
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            aria-busy={isTranslating}
            className="px-3 py-1 text-xs bg-nps-oracle-accent/20 text-nps-oracle-accent border border-nps-oracle-border rounded hover:bg-nps-oracle-accent/30 transition-colors disabled:opacity-50"
          >
            {isTranslating ? t("oracle.translating") : t("oracle.translate")}
          </button>
        )}

        {translatedText && (
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="px-3 py-1 text-xs text-nps-text-dim border border-nps-border rounded hover:text-nps-text transition-colors"
          >
            {showTranslation
              ? t("oracle.show_original")
              : t("oracle.show_translation")}
          </button>
        )}
      </div>

      {/* Error with retry */}
      {error && (
        <div role="alert" className="flex items-center gap-2 text-xs">
          <p className="text-nps-error">{error}</p>
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="text-nps-oracle-accent hover:underline"
          >
            {t("common.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
