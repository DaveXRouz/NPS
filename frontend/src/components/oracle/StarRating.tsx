import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };

function StarIcon({
  filled,
  className,
}: {
  filled: boolean;
  className: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const { t } = useTranslation();
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClass = SIZE_MAP[size];

  const handleClick = useCallback(
    (star: number) => {
      if (!readonly && onChange) {
        onChange(star);
      }
    },
    [readonly, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readonly || !onChange) return;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.min(5, value + 1);
        onChange(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        const prev = Math.max(1, value - 1);
        onChange(prev);
      }
    },
    [readonly, onChange, value],
  );

  const displayValue = hoverValue || value;

  return (
    <div
      className="inline-flex gap-0.5"
      role="radiogroup"
      aria-label={t("oracle.star_rating_label")}
      tabIndex={readonly ? -1 : 0}
      onKeyDown={handleKeyDown}
      dir="ltr"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          disabled={readonly}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          className={`transition-colors ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${star <= displayValue ? "text-yellow-400" : "text-nps-text-dim"}`}
          data-testid={`star-${star}`}
        >
          <StarIcon filled={star <= displayValue} className={sizeClass} />
        </button>
      ))}
    </div>
  );
}
