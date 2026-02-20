import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { share } from "@/services/api";
import type { SharedReadingData } from "@/types";

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
  const [data, setData] = useState<SharedReadingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    share
      .get(token)
      .then(setData)
      .catch((err) => {
        if (err?.status === 410) {
          setError(t("oracle.share_expired") || "This link has expired");
        } else {
          setError(
            t("oracle.share_not_found") || "Reading not found or link expired",
          );
        }
      })
      .finally(() => setLoading(false));
  }, [token, t]);

  // Set OG meta tags
  useEffect(() => {
    if (!data) return;
    document.title = `${t("oracle.shared_reading_title")} - NPS`;
    setMetaTag("og:title", t("oracle.shared_reading_title"));
    setMetaTag(
      "og:description",
      (data.reading.ai_interpretation as string) || "Oracle Reading",
    );
    setMetaTag("og:type", "article");
  }, [data, t]);

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
            {error}
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
              {new Date(reading.created_at as string).toLocaleDateString()}
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
            <p className="text-sm text-nps-text whitespace-pre-line">
              {reading.ai_interpretation}
            </p>
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
