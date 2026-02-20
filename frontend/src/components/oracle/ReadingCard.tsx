import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import type { StoredReading } from "@/types";

interface ReadingCardProps {
  reading: StoredReading;
  onSelect: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onDelete: (id: number) => void;
}

const TYPE_COLORS: Record<string, string> = {
  reading: "bg-[var(--nps-stat-readings)]/20 text-[var(--nps-stat-readings)]",
  time: "bg-[var(--nps-stat-readings)]/20 text-[var(--nps-stat-readings)]",
  question: "bg-[var(--nps-stat-type)]/20 text-[var(--nps-stat-type)]",
  name: "bg-[var(--nps-accent)]/20 text-[var(--nps-accent)]",
  daily: "bg-[var(--nps-stat-streak)]/20 text-[var(--nps-stat-streak)]",
  multi_user: "bg-[var(--nps-stat-type)]/20 text-[var(--nps-stat-type)]",
};

export function ReadingCard({
  reading,
  onSelect,
  onToggleFavorite,
  onDelete,
}: ReadingCardProps) {
  const { t } = useTranslation();

  const typeClass =
    TYPE_COLORS[reading.sign_type] ?? "bg-nps-bg-input text-nps-text-dim";
  const displayText =
    reading.question || reading.sign_value || reading.sign_type;
  const dateStr = new Date(reading.created_at).toLocaleDateString();

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(reading.id);
        }
      }}
      className="group bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 cursor-pointer nps-card-hover"
    >
      {/* Header row: type badge + date + actions */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${typeClass}`}
        >
          {reading.sign_type}
        </span>
        <span className="flex-1" />
        <span className="text-[10px] text-nps-text-dim">{dateStr}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(reading.id);
          }}
          className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          aria-label={t("oracle.toggle_favorite")}
          title={t("oracle.toggle_favorite")}
        >
          <Star
            className={`w-3.5 h-3.5 ${reading.is_favorite ? "fill-current text-amber-400" : "text-current"}`}
          />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(reading.id);
          }}
          className="text-sm text-[var(--nps-text-dim)] opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 transition-all duration-200"
          aria-label={t("oracle.delete_reading")}
          title={t("oracle.delete_reading")}
        >
          &times;
        </button>
      </div>

      {/* Body — clickable */}
      <button
        type="button"
        onClick={() => onSelect(reading.id)}
        className="w-full text-start"
      >
        <p className="text-xs text-nps-text truncate">{displayText}</p>
        {reading.ai_interpretation && (
          <p className="mt-1 text-[10px] text-nps-text-dim line-clamp-2">
            {reading.ai_interpretation}
          </p>
        )}
      </button>
    </div>
  );
}
