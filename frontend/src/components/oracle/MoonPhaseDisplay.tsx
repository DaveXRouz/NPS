import { useTranslation } from "react-i18next";
import type { MoonPhaseData } from "@/types";

interface MoonPhaseDisplayProps {
  moon: MoonPhaseData;
  compact?: boolean;
}

const ENERGY_COLORS: Record<string, string> = {
  Seed: "bg-green-500/15 text-green-400",
  Build: "bg-blue-500/15 text-blue-400",
  Challenge: "bg-red-500/15 text-red-400",
  Refine: "bg-purple-500/15 text-purple-400",
  Culminate: "bg-yellow-500/15 text-yellow-400",
  Share: "bg-teal-500/15 text-teal-400",
  Release: "bg-orange-500/15 text-orange-400",
  Rest: "bg-gray-500/15 text-gray-400",
};

export default function MoonPhaseDisplay({
  moon,
  compact = false,
}: MoonPhaseDisplayProps) {
  const { t } = useTranslation();
  const illumination = Math.max(0, Math.min(100, moon.illumination));
  const energyColor =
    ENERGY_COLORS[moon.energy] || "bg-nps-bg-input text-nps-text-dim";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-3xl" role="img" aria-label={moon.phase_name}>
          {moon.emoji}
        </span>
        <span className="text-lg font-semibold">{moon.phase_name}</span>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span>{t("oracle.cosmic.illumination")}</span>
          <span>{illumination.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-nps-border rounded-full h-2.5">
          <div
            className="bg-yellow-400 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${illumination}%` }}
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
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${energyColor}`}
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
              <div className="flex items-center gap-1 font-medium text-amber-400">
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
