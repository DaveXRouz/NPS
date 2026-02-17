import { useTranslation } from "react-i18next";
import type { HeartbeatData } from "@/types";

interface HeartbeatDisplayProps {
  heartbeat: HeartbeatData | null;
}

const ELEMENT_COLORS: Record<string, string> = {
  Wood: "text-green-500 bg-green-500/10 border-green-500/30",
  Fire: "text-red-500 bg-red-500/10 border-red-500/30",
  Earth: "text-amber-700 bg-amber-700/10 border-amber-700/30",
  Metal: "text-gray-400 bg-gray-400/10 border-gray-400/30",
  Water: "text-blue-500 bg-blue-500/10 border-blue-500/30",
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function HeartbeatDisplay({ heartbeat }: HeartbeatDisplayProps) {
  const { t } = useTranslation();

  if (!heartbeat) {
    return (
      <div
        className="text-xs text-nps-text-dim italic py-2"
        data-testid="heartbeat-empty"
      >
        {t("oracle.heartbeat_display_empty")}
      </div>
    );
  }

  const colorClass =
    ELEMENT_COLORS[heartbeat.element] ??
    "text-nps-text-dim bg-nps-bg-input border-nps-border";

  return (
    <div className="space-y-2" data-testid="heartbeat-display">
      {/* BPM with pulsing heart */}
      <div className="flex items-center gap-3">
        <span
          className="text-lg animate-pulse"
          style={{ animationDuration: `${60 / heartbeat.bpm}s` }}
          aria-hidden="true"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </span>
        <span
          className="text-lg font-semibold text-nps-text"
          data-testid="heartbeat-bpm"
        >
          {t("oracle.heartbeat_display_bpm", { bpm: heartbeat.bpm })}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded bg-nps-bg-input text-nps-text-dim"
          data-testid="heartbeat-source"
        >
          {heartbeat.bpm_source === "actual"
            ? t("oracle.heartbeat_display_source_actual")
            : t("oracle.heartbeat_display_source_estimated")}
        </span>
      </div>

      {/* Element badge */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded border ${colorClass}`}
          data-testid="heartbeat-element"
        >
          {t("oracle.heartbeat_display_element", {
            element: heartbeat.element,
          })}
        </span>
      </div>

      {/* Lifetime beats */}
      <p className="text-xs text-nps-text-dim" data-testid="heartbeat-lifetime">
        {t("oracle.heartbeat_display_lifetime", {
          beats: formatNumber(heartbeat.total_lifetime_beats),
        })}
      </p>
    </div>
  );
}
