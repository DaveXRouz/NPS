import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import type { ConsultationResult } from "@/types";

interface ShareButtonProps {
  result: ConsultationResult;
}

function generateShareText(
  result: ConsultationResult,
  t: TFunction,
  formatDate: (dateStr: string) => string,
): string {
  const lines: string[] = [t("oracle.shared_reading_title"), ""];

  switch (result.type) {
    case "reading": {
      const d = result.data;
      lines.push(
        `${t("oracle.date_label")}: ${d.generated_at ? formatDate(d.generated_at) : "N/A"}`,
      );
      lines.push(`${t("oracle.reading_type")}: ${t("oracle.type_time_title")}`);
      lines.push("");
      lines.push(d.summary);
      lines.push("");
      if (d.numerology) {
        lines.push(`${t("oracle.life_path")}: ${d.numerology.life_path}`);
      }
      if (d.fc60) {
        lines.push(
          `${t("oracle.element")}: ${d.fc60.element} | ${t("oracle.energy")}: ${d.fc60.energy_level}`,
        );
      }
      if (d.moon) {
        lines.push(
          `${t("oracle.details_moon_phase")}: ${d.moon.emoji} ${d.moon.phase_name}`,
        );
      }
      break;
    }
    case "question": {
      const d = result.data;
      lines.push(
        `${t("oracle.reading_type")}: ${t("oracle.type_question_title")}`,
      );
      lines.push("");
      lines.push(`${t("oracle.question_label")}: ${d.question}`);
      lines.push(`${t("oracle.question_number_label")}: ${d.question_number}`);
      if (d.ai_interpretation) {
        lines.push("");
        lines.push(d.ai_interpretation);
      }
      break;
    }
    case "name": {
      const d = result.data;
      lines.push(`${t("oracle.reading_type")}: ${t("oracle.type_name_title")}`);
      lines.push("");
      lines.push(`${t("oracle.field_name")}: ${d.name}`);
      lines.push(
        `${t("oracle.expression")}: ${d.expression} | ${t("oracle.soul_urge")}: ${d.soul_urge} | ${t("oracle.personality")}: ${d.personality}`,
      );
      if (d.ai_interpretation) {
        lines.push("");
        lines.push(d.ai_interpretation);
      }
      break;
    }
  }

  lines.push("");
  lines.push(`— ${t("oracle.export_generated_by")}`);
  return lines.join("\n");
}

export function ShareButton({ result }: ShareButtonProps) {
  const { t } = useTranslation();
  const { formatDateLocale } = useFormattedDate();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = generateShareText(result, t, formatDateLocale);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="share-button px-2 py-1 text-xs bg-nps-bg-input text-nps-text-dim hover:text-nps-text rounded transition-colors"
    >
      {copied ? t("oracle.copied") : t("oracle.share")}
    </button>
  );
}
