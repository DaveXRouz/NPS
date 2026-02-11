import { useTranslation } from "react-i18next";
import {
  autoSelectSystem,
  type NumerologySystem,
} from "@/utils/scriptDetector";

interface NumerologySystemSelectorProps {
  value: NumerologySystem;
  onChange: (system: NumerologySystem) => void;
  userName?: string;
  disabled?: boolean;
}

const SYSTEMS: NumerologySystem[] = [
  "auto",
  "pythagorean",
  "chaldean",
  "abjad",
];

export function NumerologySystemSelector({
  value,
  onChange,
  userName,
  disabled = false,
}: NumerologySystemSelectorProps) {
  const { t, i18n } = useTranslation();

  const detectedSystem =
    value === "auto" && userName
      ? autoSelectSystem(userName, i18n.language)
      : null;

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="block text-sm text-nps-text-dim mb-1">
        {t("oracle.numerology_selector_title")}
      </legend>

      <div className="space-y-1">
        {SYSTEMS.map((system) => (
          <label
            key={system}
            className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
              value === system
                ? "bg-nps-oracle-accent/10 border border-nps-oracle-accent"
                : "border border-transparent hover:bg-nps-bg-input"
            }`}
          >
            <input
              type="radio"
              name="numerology-system"
              value={system}
              checked={value === system}
              onChange={() => onChange(system)}
              className="mt-0.5 accent-nps-oracle-accent"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-nps-text font-medium">
                {t(`oracle.numerology_selector_${system}`)}
              </span>
              <p className="text-xs text-nps-text-dim">
                {t(`oracle.numerology_selector_${system}_desc`)}
              </p>
              {system === "auto" && detectedSystem && (
                <p className="text-xs text-nps-oracle-accent mt-0.5">
                  {t("oracle.numerology_selector_detected", {
                    system: t(`oracle.numerology_selector_${detectedSystem}`),
                  })}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
