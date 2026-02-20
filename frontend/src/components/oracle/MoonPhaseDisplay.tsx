import { useTranslation } from "react-i18next";
import { MoonPhaseIcon } from "@/components/common/icons";
import type { MoonPhaseData } from "@/types";

interface MoonPhaseDisplayProps {
  moon: MoonPhaseData;
  compact?: boolean;
}

/** Energy color tokens — each maps to a CSS custom property value.
 *  Format: [text color hex, bg color with alpha]
 *  These correspond to moon-phase energy levels.
 */
const ENERGY_COLORS: Record<string, { text: string; bg: string }> = {
  Seed: { text: "#4ade80", bg: "rgba(34,197,94,0.15)" },
  Build: { text: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
  Challenge: { text: "#f87171", bg: "rgba(239,68,68,0.15)" },
  Refine: { text: "#c084fc", bg: "rgba(168,85,247,0.15)" },
  Culminate: { text: "#facc15", bg: "rgba(234,179,8,0.15)" },
  Share: { text: "#2dd4bf", bg: "rgba(20,184,166,0.15)" },
  Release: { text: "#fb923c", bg: "rgba(249,115,22,0.15)" },
  Rest: { text: "#a1a1aa", bg: "rgba(161,161,170,0.15)" },
};

export default function MoonPhaseDisplay({
  moon,
  compact = false,
}: MoonPhaseDisplayProps) {
  const { t } = useTranslation();
  const illumination = Math.max(0, Math.min(100, moon.illumination));
  const energyColor = ENERGY_COLORS[moon.energy] || {
    text: "var(--nps-text-dim)",
    bg: "var(--nps-bg-input)",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MoonPhaseIcon
          phaseName={moon.phase_name}
          size={32}
          className="text-nps-text"
        />
        <span className="text-lg font-semibold">{moon.phase_name}</span>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span>{t("oracle.cosmic.illumination")}</span>
          <span>{illumination.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-nps-border rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-300"
            style={{
              width: `${illumination}%`,
              backgroundColor: "var(--nps-energy-peak)",
            }}
            role="progressbar"
            aria-valuenow={illumination}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="text-xs text-nps-text-dim mt-1">
          {t("oracle.cosmic.moon_age")}: {moon.age.toFixed(2)}{" "}
          {t("oracle.cosmic.days")}
        </div>
      </div>

      {moon.energy && (
        <div>
          <span className="text-sm font-medium">
            {t("oracle.cosmic.energy")}:{" "}
          </span>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ color: energyColor.text, backgroundColor: energyColor.bg }}
          >
            {moon.energy}
          </span>
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {moon.best_for && (
            <div>
              <div className="flex items-center gap-1 font-medium text-nps-success">
                <span>&#10003;</span>
                <span>{t("oracle.cosmic.best_for")}</span>
              </div>
              <p className="text-nps-text-dim mt-0.5">{moon.best_for}</p>
            </div>
          )}
          {moon.avoid && (
            <div>
              <div
                className="flex items-center gap-1 font-medium"
                style={{ color: "var(--nps-energy-medium)" }}
              >
                <span>&#9888;</span>
                <span>{t("oracle.cosmic.avoid")}</span>
              </div>
              <p className="text-nps-text-dim mt-0.5">{moon.avoid}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
