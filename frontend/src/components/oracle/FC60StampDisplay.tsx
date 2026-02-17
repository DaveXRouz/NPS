import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Copy } from "lucide-react";
import type { FC60StampData, FC60StampSegment } from "@/types";

interface FC60StampDisplayProps {
  stamp: FC60StampData;
  size?: "compact" | "normal" | "large";
  showTooltips?: boolean;
  showCopyButton?: boolean;
}

const ELEMENT_COLORS: Record<string, { text: string; bg: string }> = {
  WU: { text: "text-green-500", bg: "bg-green-500/10" },
  FI: { text: "text-red-500", bg: "bg-red-500/10" },
  ER: { text: "text-amber-700", bg: "bg-amber-700/10" },
  MT: { text: "text-yellow-400", bg: "bg-yellow-400/10" },
  WA: { text: "text-blue-500", bg: "bg-blue-500/10" },
};

const ANIMAL_MEANINGS: Record<string, string> = {
  RA: "Instinct, resourcefulness",
  OX: "Endurance, patience",
  TI: "Courage, power",
  RU: "Intuition, diplomacy",
  DR: "Destiny, transformation",
  SN: "Wisdom, precision",
  HO: "Freedom, movement",
  GO: "Vision, creativity",
  MO: "Adaptability, cleverness",
  RO: "Truth, confidence",
  DO: "Loyalty, protection",
  PI: "Abundance, generosity",
};

function getElementFromToken(token: string): string {
  if (token.length >= 4) return token.slice(2, 4);
  return "";
}

function getAnimalFromToken(token: string): string {
  if (token.length >= 2) return token.slice(0, 2);
  return "";
}

function getElementStyle(token: string): { text: string; bg: string } {
  const element = getElementFromToken(token);
  return ELEMENT_COLORS[element] || { text: "", bg: "" };
}

function TokenBadge({
  segment,
  label,
  showTooltip,
}: {
  segment: FC60StampSegment;
  label: string;
  showTooltip: boolean;
}) {
  const { t } = useTranslation();
  const style = getElementStyle(segment.token);
  const animal = getAnimalFromToken(segment.token);
  const animalKey = `oracle.fc60_animals_${animal}`;
  const animalName = t(animalKey, {
    defaultValue: segment.animalName || animal,
  });
  const elementKey = `oracle.fc60_elements_${getElementFromToken(segment.token)}`;
  const elementName = t(elementKey, {
    defaultValue: segment.elementName || "",
  });
  const meaning = ANIMAL_MEANINGS[animal] || "";

  const tooltipText = `${label}: ${animalName} ${elementName} (${segment.token})${
    meaning ? ` — ${meaning}` : ""
  }`;

  return (
    <span
      className={`inline-block rounded px-1 ${style.bg} ${style.text}`}
      title={showTooltip ? tooltipText : undefined}
      data-element={getElementFromToken(segment.token)}
    >
      {segment.token}
    </span>
  );
}

function AnimalBadge({
  token,
  label,
  showTooltip,
}: {
  token: string;
  label: string;
  showTooltip: boolean;
}) {
  const { t } = useTranslation();
  const animalKey = `oracle.fc60_animals_${token}`;
  const animalName = t(animalKey, { defaultValue: token });
  const meaning = ANIMAL_MEANINGS[token] || "";

  const tooltipText = `${label}: ${animalName}${meaning ? ` — ${meaning}` : ""}`;

  return (
    <span
      className="inline-block"
      title={showTooltip ? tooltipText : undefined}
    >
      {token}
    </span>
  );
}

export default function FC60StampDisplay({
  stamp,
  size = "normal",
  showTooltips = true,
  showCopyButton = true,
}: FC60StampDisplayProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    compact: "text-xs gap-0.5",
    normal: "text-sm gap-1",
    large: "text-lg gap-2",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stamp.fc60);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement("textarea");
      textarea.value = stamp.fc60;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isDay =
    stamp.time?.half_type === "day" || stamp.time?.half === "\u2600";
  const halfLabel = isDay ? t("oracle.fc60_half_am") : t("oracle.fc60_half_pm");

  return (
    <div
      className={`font-mono inline-flex flex-wrap items-center ${sizeClasses[size]}`}
      aria-label={`FC60 stamp: ${stamp.fc60}`}
      data-size={size}
    >
      {/* Date part: WD-MO-DOM */}
      <span
        className="inline-flex items-center gap-0.5"
        title={
          showTooltips
            ? `${t("oracle.fc60_weekday")}: ${stamp.weekday.name} (${stamp.weekday.planet} — ${stamp.weekday.domain})`
            : undefined
        }
      >
        <span>{stamp.weekday.token}</span>
      </span>
      <span className="text-nps-text-dim">-</span>
      <AnimalBadge
        token={stamp.month.token}
        label={`${t("oracle.fc60_month")} ${stamp.month.index}`}
        showTooltip={showTooltips}
      />
      <span className="text-nps-text-dim">-</span>
      <TokenBadge
        segment={stamp.dom}
        label={`${t("oracle.fc60_day")} ${stamp.dom.value ?? ""}`}
        showTooltip={showTooltips}
      />

      {/* Time part: HALF+HOUR-MINUTE-SECOND */}
      {stamp.time && (
        <>
          <span className="mx-1" />
          <span
            className={`inline-flex items-center ${isDay ? "text-yellow-400" : "text-blue-300"}`}
            title={showTooltips ? halfLabel : undefined}
          >
            {isDay ? <Sun size={14} /> : <Moon size={14} />}
          </span>
          <AnimalBadge
            token={stamp.time.hour.token}
            label={`${t("oracle.fc60_hour")} ${stamp.time.hour.value ?? ""}`}
            showTooltip={showTooltips}
          />
          <span className="text-nps-text-dim">-</span>
          <TokenBadge
            segment={stamp.time.minute}
            label={`${t("oracle.fc60_minute")} ${stamp.time.minute.value ?? ""}`}
            showTooltip={showTooltips}
          />
          <span className="text-nps-text-dim">-</span>
          <TokenBadge
            segment={stamp.time.second}
            label={`${t("oracle.fc60_second")} ${stamp.time.second.value ?? ""}`}
            showTooltip={showTooltips}
          />
        </>
      )}

      {/* Copy button */}
      {showCopyButton && size !== "compact" && (
        <button
          type="button"
          onClick={handleCopy}
          className="ms-2 p-1 text-nps-text-dim hover:text-nps-text transition-colors"
          aria-label={t("oracle.fc60_copy")}
          title={t("oracle.fc60_copy")}
        >
          {copied ? (
            <span className="text-green-400 text-xs">
              {t("oracle.fc60_copied")}
            </span>
          ) : (
            <Copy size={16} />
          )}
        </button>
      )}
    </div>
  );
}
