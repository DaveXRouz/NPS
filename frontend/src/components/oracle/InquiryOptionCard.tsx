import { useTranslation } from "react-i18next";

interface InquiryOptionCardProps {
  emoji: string;
  labelKey: string;
  descKey: string;
  selected: boolean;
  onSelect: () => void;
}

export default function InquiryOptionCard({
  emoji,
  labelKey,
  descKey,
  selected,
  onSelect,
}: InquiryOptionCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`
        w-full min-h-[44px] p-3 rounded-lg border text-start transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[var(--nps-accent)]/50
        ${
          selected
            ? "bg-[var(--nps-accent)]/15 border-[var(--nps-accent)] shadow-[0_0_12px_var(--nps-glass-glow)]"
            : "bg-[var(--nps-accent)]/5 border-[var(--nps-glass-border)] hover:bg-[var(--nps-accent)]/10"
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg flex-shrink-0">{emoji}</span>
        <div className="min-w-0">
          <p
            className={`text-sm font-medium ${
              selected ? "text-nps-text-bright" : "text-nps-text"
            }`}
          >
            {t(labelKey)}
          </p>
          <p className="text-xs text-nps-text-dim">{t(descKey)}</p>
        </div>
      </div>
    </button>
  );
}
