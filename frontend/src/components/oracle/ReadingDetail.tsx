import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import type { StoredReading } from "@/types";

interface ReadingDetailProps {
  reading: StoredReading;
  onClose: () => void;
  onToggleFavorite: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ReadingDetail({
  reading,
  onClose,
  onToggleFavorite,
  onDelete,
}: ReadingDetailProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-6 space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs rounded-full bg-[var(--nps-accent)]/20 text-[var(--nps-accent)] border border-[var(--nps-accent)]/30 font-medium">
            {reading.sign_type}
          </span>
          <span className="text-xs text-nps-text-dim">
            {new Date(reading.created_at).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleFavorite(reading.id)}
            className="text-base transition-all duration-200 hover:scale-110 hover:text-amber-400"
            aria-label={t("oracle.toggle_favorite")}
            title={t("oracle.toggle_favorite")}
          >
            <Star
              className={`w-4 h-4 ${reading.is_favorite ? "fill-current text-amber-400" : "text-current"}`}
            />
          </button>
          <button
            type="button"
            onClick={() => onDelete(reading.id)}
            className="text-sm text-[var(--nps-text-dim)] hover:text-red-400 transition-all duration-200"
            title={t("oracle.delete_reading")}
          >
            {t("oracle.delete_reading")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[var(--nps-text-dim)] hover:text-[var(--nps-text)] transition-all duration-200"
          >
            {t("oracle.close_detail")}
          </button>
        </div>
      </div>

      {/* Question/Sign */}
      {reading.question && (
        <div>
          <h4 className="text-[10px] text-nps-text-dim uppercase tracking-wider mb-1">
            {t("oracle.question_label")}
          </h4>
          <p className="text-xs text-nps-text">{reading.question}</p>
        </div>
      )}
      {reading.sign_value && (
        <div>
          <h4 className="text-[10px] text-nps-text-dim uppercase tracking-wider mb-1">
            {t("oracle.sign_label")}
          </h4>
          <p className="text-xs text-nps-text">{reading.sign_value}</p>
        </div>
      )}

      {/* AI Interpretation */}
      {reading.ai_interpretation && (
        <div>
          <h4 className="text-[10px] text-nps-text-dim uppercase tracking-wider mb-1">
            {t("oracle.ai_interpretation")}
          </h4>
          <p className="text-xs text-nps-text whitespace-pre-line">
            {reading.ai_interpretation}
          </p>
        </div>
      )}

      {/* Raw reading result */}
      {reading.reading_result && (
        <div>
          <h4 className="text-[10px] text-nps-text-dim uppercase tracking-wider mb-1">
            {t("oracle.reading_data")}
          </h4>
          <pre className="text-[10px] text-[var(--nps-text-dim)] overflow-x-auto max-h-60 overflow-y-auto bg-[var(--nps-bg-input)] border border-[var(--nps-glass-border)] rounded-lg p-3">
            {JSON.stringify(reading.reading_result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
