import type { ComponentType } from "react";
import { User, Lock, Search, Brain, Package } from "lucide-react";
import { CrystalBallIcon } from "./icons";

type IconVariant =
  | "readings"
  | "profiles"
  | "vault"
  | "search"
  | "learning"
  | "generic";

interface EmptyStateProps {
  icon?: IconVariant;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const ICON_MAP: Record<
  IconVariant,
  ComponentType<{ size?: number | string; className?: string }>
> = {
  readings: CrystalBallIcon,
  profiles: User,
  vault: Lock,
  search: Search,
  learning: Brain,
  generic: Package,
};

export function EmptyState({
  icon = "generic",
  title,
  description,
  action,
}: EmptyStateProps) {
  const IconComponent = ICON_MAP[icon];

  return (
    <div
      className="flex flex-col items-center justify-center py-8 text-center"
      data-testid="empty-state"
    >
      <span
        className="mb-3 text-[var(--nps-accent)]"
        style={{
          filter:
            "drop-shadow(0 0 12px var(--nps-accent)) drop-shadow(0 0 24px color-mix(in srgb, var(--nps-accent) 40%, transparent))",
        }}
        aria-hidden="true"
      >
        <IconComponent size={64} />
      </span>
      <p className="text-sm font-medium text-nps-text mb-1">{title}</p>
      {description && (
        <p className="text-xs text-nps-text-dim max-w-xs">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 px-4 py-2 text-sm bg-nps-bg-button text-white rounded-lg hover:opacity-90 transition-opacity duration-300"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
