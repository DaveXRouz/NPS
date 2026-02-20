import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminOracleProfile } from "@/types";

interface ProfileActionsProps {
  profile: AdminOracleProfile;
  onDelete: (id: number) => void;
}

export function ProfileActions({ profile, onDelete }: ProfileActionsProps) {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);

  if (profile.deleted_at !== null) {
    return (
      <span className="text-xs text-[var(--nps-text-dim)]">
        {t("admin.status_deleted")}
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-2.5 py-1.5 text-xs bg-red-500/10 backdrop-blur-[var(--nps-glass-blur-sm)] border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 hover:shadow-[0_0_8px_rgba(239,68,68,0.2)] transition-all duration-200"
      >
        {t("admin.action_delete")}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[var(--nps-glass-blur-sm)] flex items-center justify-center z-50">
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-[0_0_24px_var(--nps-glass-glow)]">
            <p className="text-[var(--nps-text)] mb-4">
              {t("admin.confirm_delete_profile", { name: profile.name })}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  onDelete(profile.id);
                  setShowConfirm(false);
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
