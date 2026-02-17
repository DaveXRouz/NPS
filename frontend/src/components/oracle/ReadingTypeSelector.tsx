import { useTranslation } from "react-i18next";

export type ReadingType = "time" | "name" | "question" | "daily" | "multi";

interface ReadingTypeSelectorProps {
  value: ReadingType;
  onChange: (type: ReadingType) => void;
  disabled?: boolean;
}

const READING_TYPES: {
  type: ReadingType;
  labelKey: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "time",
    labelKey: "oracle.type_time",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    type: "name",
    labelKey: "oracle.type_name",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    type: "question",
    labelKey: "oracle.type_question",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    type: "daily",
    labelKey: "oracle.type_daily",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    type: "multi",
    labelKey: "oracle.type_multi",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export function ReadingTypeSelector({
  value,
  onChange,
  disabled = false,
}: ReadingTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t("oracle.reading_type")}
      className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible"
    >
      {READING_TYPES.map(({ type, labelKey, icon }) => {
        const isActive = value === type;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="oracle-form-panel"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg border transition-all duration-200 whitespace-nowrap ${
              isActive
                ? "bg-[var(--nps-accent)]/15 text-[var(--nps-accent)] border-[var(--nps-accent)]/30 shadow-[0_0_8px_var(--nps-glass-glow)]"
                : "text-[var(--nps-text-dim)] hover:bg-[var(--nps-bg-hover)] border-transparent"
            } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
          >
            {icon}
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
