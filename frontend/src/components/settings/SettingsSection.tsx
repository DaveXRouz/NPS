import { useState, type ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SettingsSection({
  title,
  description,
  defaultOpen = false,
  children,
}: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-nps-bg-card border border-nps-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-start hover:bg-nps-bg-card/80 transition-colors"
        aria-expanded={isOpen}
        aria-label={`${title} section`}
      >
        <div>
          <h3 className="text-sm font-semibold text-nps-text-bright">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-nps-text-dim mt-0.5">{description}</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-nps-text-dim transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}
