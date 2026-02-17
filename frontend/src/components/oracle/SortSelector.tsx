import { useTranslation } from "react-i18next";
import { ArrowUpDown } from "lucide-react";

export type SortOption = "newest" | "oldest" | "confidence";

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortSelector({ value, onChange }: SortSelectorProps) {
  const { t } = useTranslation();

  const options: { key: SortOption; label: string }[] = [
    { key: "newest", label: t("oracle.sort_newest") },
    { key: "oldest", label: t("oracle.sort_oldest") },
    { key: "confidence", label: t("oracle.sort_confidence") },
  ];

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown
        className="w-4 h-4 text-[var(--nps-text-dim)] shrink-0"
        aria-hidden="true"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="px-3 py-2 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-200"
        aria-label={t("oracle.sort_label")}
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
