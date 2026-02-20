import { useTranslation } from "react-i18next";
import type { OracleUser } from "@/types";

interface UserCardProps {
  user: OracleUser;
  onEdit: (user: OracleUser) => void;
  onDelete: (user: OracleUser) => void;
  onSelect?: (user: OracleUser) => void;
  isSelected?: boolean;
}

function formatTimezone(hours?: number, minutes?: number): string | null {
  if (hours === undefined && minutes === undefined) return null;
  if (hours === 0 && (minutes === 0 || minutes === undefined)) return null;
  const h = hours ?? 0;
  const m = minutes ?? 0;
  const sign = h >= 0 ? "+" : "";
  if (m === 0) return `UTC${sign}${h}`;
  return `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function UserCard({
  user,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
}: UserCardProps) {
  const { t } = useTranslation();

  const location = [user.country, user.city].filter(Boolean).join(", ");
  const tz = formatTimezone(user.timezone_hours, user.timezone_minutes);

  return (
    <div
      role="article"
      aria-label={user.name}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(user) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(user);
              }
            }
          : undefined
      }
      className={`bg-[var(--nps-glass-bg)] backdrop-blur-sm border rounded-xl p-4 nps-card-hover ${
        isSelected
          ? "border-[var(--nps-accent)] ring-1 ring-[var(--nps-accent)]/30"
          : "border-[var(--nps-glass-border)]"
      } ${onSelect ? "cursor-pointer" : ""}`}
      data-testid={`user-card-${user.id}`}
    >
      {/* Header: name + Persian */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-nps-text truncate">
            {user.name}
          </p>
          {user.name_persian && (
            <p className="text-xs text-nps-text-dim truncate" dir="rtl">
              {user.name_persian}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(user);
            }}
            className="p-1.5 text-nps-text-dim hover:text-nps-oracle-accent transition-colors rounded hover:bg-nps-bg-hover"
            aria-label={t("oracle.edit_profile")}
            data-testid={`edit-user-${user.id}`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(user);
            }}
            className="p-1.5 text-nps-text-dim hover:text-nps-error transition-colors rounded hover:bg-nps-bg-hover"
            aria-label={t("oracle.delete_profile")}
            data-testid={`delete-user-${user.id}`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs text-nps-text-dim">
        {/* Birthday */}
        <p data-testid="user-birthday">{user.birthday}</p>

        {/* Location */}
        {location && <p data-testid="user-location">{location}</p>}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {/* Gender badge */}
          {user.gender && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                user.gender === "male"
                  ? "bg-nps-oracle-accent/15 text-nps-oracle-accent"
                  : "bg-pink-500/15 text-pink-400"
              }`}
              data-testid="gender-badge"
            >
              {t(`oracle.gender_${user.gender}`)}
            </span>
          )}

          {/* Heart rate */}
          {user.heart_rate_bpm !== undefined &&
            user.heart_rate_bpm !== null && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-medium"
                data-testid="heart-rate-badge"
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
                {user.heart_rate_bpm}
              </span>
            )}

          {/* Timezone */}
          {tz && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-nps-bg-hover text-nps-text-dim text-[10px] font-medium"
              data-testid="timezone-badge"
            >
              {tz}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
