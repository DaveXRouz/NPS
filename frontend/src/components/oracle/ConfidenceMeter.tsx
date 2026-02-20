import { useTranslation } from "react-i18next";
import type { ConfidenceData, ConfidenceBoost } from "@/types";

interface ConfidenceMeterProps {
  confidence: ConfidenceData | null;
  boosts: ConfidenceBoost[];
}

/** Confidence bar/text colors mapped to CSS variable tokens.
 *  low (<40) red, medium (40-70) amber, high (70-90) green, peak (>90) gold.
 */
const LEVEL_COLORS: Record<string, string> = {
  very_high: "var(--nps-confidence-peak)",
  high: "var(--nps-confidence-high)",
  medium: "var(--nps-confidence-medium)",
  low: "var(--nps-confidence-low)",
};

export function ConfidenceMeter({ confidence, boosts }: ConfidenceMeterProps) {
  const { t } = useTranslation();

  if (!confidence) {
    return (
      <div
        className="h-6 bg-nps-bg-input rounded animate-pulse"
        data-testid="confidence-skeleton"
      />
    );
  }

  const levelColor = LEVEL_COLORS[confidence.level] ?? "var(--nps-text-dim)";
  const levelLabel = t(`oracle.confidence_level_${confidence.level}`);

  return (
    <div className="space-y-2" data-testid="confidence-meter">
      {/* Score label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-nps-text-dim">
          {t("oracle.confidence_label")}
        </span>
        <span
          className="font-medium"
          style={{ color: levelColor }}
          data-testid="confidence-label"
        >
          {t("oracle.confidence_score", { score: confidence.score })} —{" "}
          {levelLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2 bg-nps-bg-input rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={confidence.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("oracle.confidence_label")}
        title={t("oracle.confidence_factors", {
          count: boosts.filter((b) => b.filled).length,
        })}
        data-testid="confidence-bar"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${confidence.score}%`, backgroundColor: levelColor }}
          data-testid="confidence-fill"
        />
      </div>

      {/* Completeness breakdown */}
      {boosts.length > 0 && (
        <div className="space-y-1 pt-1" data-testid="confidence-boosts">
          {boosts.map((boost) => (
            <div
              key={boost.field}
              className="flex items-center justify-between text-xs"
              data-testid={`boost-${boost.field}`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[10px] leading-none"
                  style={
                    boost.filled
                      ? {
                          backgroundColor: "var(--nps-confidence-high)",
                          color: "#fff",
                        }
                      : { border: "1.5px solid var(--nps-text-dim)" }
                  }
                  data-testid={`boost-icon-${boost.field}`}
                  aria-hidden="true"
                >
                  {boost.filled && (
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={
                    boost.filled ? "text-nps-text" : "text-nps-text-dim"
                  }
                >
                  {boost.label}
                </span>
              </span>
              <span className="text-nps-text-dim">
                {boost.filled ? (
                  `+${boost.boost}%`
                ) : (
                  <span className="text-nps-oracle-accent/60 cursor-pointer hover:text-nps-oracle-accent">
                    {t("oracle.confidence_boost_add")}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Priority hint */}
      <p className="text-[10px] text-nps-text-dim/50 pt-1">
        {t("oracle.confidence_priority_hint")}
      </p>
    </div>
  );
}
