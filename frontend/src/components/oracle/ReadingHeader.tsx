import { useTranslation } from "react-i18next";
import { useFormattedDate } from "@/hooks/useFormattedDate";

interface ReadingHeaderProps {
  userName: string;
  readingDate: string;
  readingType: "reading" | "question" | "name";
  confidence?: number;
}

const TYPE_BADGES: Record<string, { color: string }> = {
  reading: { color: "bg-nps-oracle-accent/20 text-nps-oracle-accent" },
  question: { color: "bg-nps-purple/20 text-nps-purple" },
  name: { color: "bg-green-600/20 text-green-400" },
};

function getConfidenceColor(confidence: number): string {
  if (confidence > 70) return "bg-nps-success/20 text-nps-success";
  if (confidence > 40) return "bg-nps-warning/20 text-nps-warning";
  return "bg-nps-error/20 text-nps-error";
}

export function ReadingHeader({
  userName,
  readingDate,
  readingType,
  confidence,
}: ReadingHeaderProps) {
  const { t } = useTranslation();
  const { formatDateLocale } = useFormattedDate();

  const badgeConfig = TYPE_BADGES[readingType] ?? TYPE_BADGES.reading;
  const formattedDate = formatDateLocale(readingDate);
  const typeLabel =
    readingType === "reading"
      ? t("oracle.type_reading")
      : readingType === "question"
        ? t("oracle.type_question")
        : t("oracle.type_name");

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 py-2">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-nps-text-bright">
          {userName}
        </h3>
        <span className={`px-2 py-0.5 text-xs rounded ${badgeConfig.color}`}>
          {typeLabel}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-nps-text-dim">{formattedDate}</span>
        {confidence !== undefined && (
          <span
            className={`px-2 py-0.5 text-xs rounded ${getConfidenceColor(confidence)}`}
            data-testid="confidence-pill"
          >
            {Math.round(confidence)}%
          </span>
        )}
      </div>
    </div>
  );
}
