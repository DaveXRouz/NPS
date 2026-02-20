import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { share } from "@/services/api";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { formatAiInterpretation } from "@/utils/formatAiInterpretation";
import type { SharedReadingData } from "@/types";

function sanitizeForMeta(raw: string, maxLen = 200): string {
  // Strip HTML tags, collapse whitespace, trim to maxLen
  const text = raw
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

function setMetaTag(property: string, content: string) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export default function SharedReading() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const { formatDateLocale } = useFormattedDate();
  const tRef = useRef(t);
  tRef.current = t;
  const [data, setData] = useState<SharedReadingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    share
      .get(token)
      .then(setData)
      .catch((err) => {
        // Store the error key — translate at render time so language changes apply
        if (err?.status === 410) {
          setError("oracle.share_expired");
        } else {
          setError("oracle.share_not_found");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Set OG meta tags (only when data changes, not on language change)
  useEffect(() => {
    if (!data) return;
    const translate = tRef.current;
    document.title = `${translate("oracle.shared_reading_title")} - NPS`;
    setMetaTag("og:title", translate("oracle.shared_reading_title"));
    setMetaTag(
      "og:description",
      sanitizeForMeta(
        (data.reading.ai_interpretation as string) || "Oracle Reading",
      ),
    );
    setMetaTag("og:type", "article");
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-nps-bg flex items-center justify-center">
        <div className="animate-pulse text-nps-text-dim text-sm">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-nps-bg flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-bold text-nps-oracle-accent mb-2">
            NPS Oracle
          </h1>
          <p className="text-sm text-nps-error" role="alert">
            {t(error)}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const reading = data.reading as {
    id: number;
    sign_type: string;
    sign_value: string;
    question: string | null;
    ai_interpretation: string | null;
    created_at: string | null;
    is_favorite: boolean;
    reading_result: Record<string, unknown> | null;
  };
  const readingResult = reading.reading_result;

  return (
    <div className="min-h-screen bg-nps-bg p-6 max-w-2xl mx-auto">
      <header className="text-center mb-6">
        <h1 className="text-xl font-bold text-nps-oracle-accent">NPS Oracle</h1>
        <p className="text-xs text-nps-text-dim">
          {t("oracle.shared_reading_footer")}
        </p>
      </header>

      <div className="space-y-4 bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border-std)] rounded-xl p-4 shadow-lg">
        {/* Reading type badge */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs bg-nps-oracle-accent/20 text-nps-oracle-accent rounded">
            {reading.sign_type}
          </span>
          {reading.created_at && (
            <span className="text-xs text-nps-text-dim">
              {formatDateLocale(reading.created_at as string)}
            </span>
          )}
        </div>

        {/* Question if present */}
        {reading.question && (
          <div>
            <h3 className="text-xs text-nps-text-dim mb-1">
              {t("oracle.question_label")}
            </h3>
            <p className="text-sm text-nps-text">{reading.question}</p>
          </div>
        )}

        {/* Reading result data */}
        {readingResult && (
          <div className="space-y-3">
            {typeof readingResult.summary === "string" && (
              <div>
                <h3 className="text-xs text-nps-text-dim mb-1">
                  {t("oracle.tab_summary")}
                </h3>
                <p className="text-sm text-nps-text">{readingResult.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* AI Interpretation */}
        {reading.ai_interpretation && (
          <div>
            <h3 className="text-xs text-nps-text-dim mb-1">
              {t("oracle.ai_interpretation")}
            </h3>
            <div className="space-y-2">
              {formatAiInterpretation(
                typeof reading.ai_interpretation === "string"
                  ? reading.ai_interpretation
                  : JSON.stringify(reading.ai_interpretation),
              ).map((section, i) => (
                <div key={i}>
                  {section.heading && (
                    <h4 className="text-sm font-medium text-nps-text-bright mb-0.5">
                      {section.heading}
                    </h4>
                  )}
                  <p className="text-sm text-nps-text whitespace-pre-line">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="text-center mt-8 text-xs text-nps-text-dim space-y-1">
        <p>{t("oracle.shared_reading_footer")}</p>
        <p>{t("oracle.share_views", { count: data.view_count })}</p>
        <p className="mt-4 text-nps-oracle-accent/50">
          {t("oracle.disclaimer")}
        </p>
      </footer>
    </div>
  );
}
