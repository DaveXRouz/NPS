import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SystemUser } from "@/types";

interface UserActionsProps {
  user: SystemUser;
  currentUserId: string;
  onRoleChange: (id: string, role: string) => void;
  onResetPassword: (id: string) => void;
  onStatusChange: (id: string, isActive: boolean) => void;
  tempPassword: string | null;
}

const ROLES = ["admin", "user", "readonly"] as const;

export function UserActions({
  user,
  currentUserId,
  onRoleChange,
  onResetPassword,
  onStatusChange,
  tempPassword,
}: UserActionsProps) {
  const { t } = useTranslation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const isSelf = user.id === currentUserId;

  const handleConfirm = () => {
    if (confirmAction === "reset") {
      onResetPassword(user.id);
    } else if (confirmAction === "deactivate") {
      onStatusChange(user.id, false);
    } else if (confirmAction === "activate") {
      onStatusChange(user.id, true);
    }
    setConfirmAction(null);
  };

  return (
    <div className="flex items-center gap-1 relative">
      {/* Role dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowRoleMenu(!showRoleMenu)}
          disabled={isSelf}
          title={
            isSelf ? t("admin.cannot_modify_self") : t("admin.action_edit_role")
          }
          className="px-2.5 py-1.5 text-xs bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
        >
          {t("admin.action_edit_role")}
        </button>
        {showRoleMenu && !isSelf && (
          <div className="absolute top-full start-0 mt-1 bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl shadow-lg z-10 min-w-[120px] overflow-hidden">
            {ROLES.filter((r) => r !== user.role).map((role) => (
              <button
                key={role}
                onClick={() => {
                  onRoleChange(user.id, role);
                  setShowRoleMenu(false);
                }}
                className="block w-full text-start px-3 py-2 text-xs text-[var(--nps-text)] hover:bg-[var(--nps-glass-glow)] transition-colors duration-150"
              >
                {t(`admin.role_${role}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reset password */}
      <button
        onClick={() => setConfirmAction("reset")}
        className="px-2.5 py-1.5 text-xs bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
      >
        {t("admin.action_reset_password")}
      </button>

      {/* Activate/Deactivate */}
      <button
        onClick={() =>
          setConfirmAction(user.is_active ? "deactivate" : "activate")
        }
        disabled={isSelf && user.is_active}
        title={isSelf ? t("admin.cannot_modify_self") : undefined}
        className={`px-2.5 py-1.5 text-xs backdrop-blur-[var(--nps-glass-blur-sm)] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 ${
          user.is_active
            ? "bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_8px_rgba(239,68,68,0.2)]"
            : "bg-green-500/10 border border-green-500/40 text-green-400 hover:bg-green-500/20 hover:shadow-[0_0_8px_rgba(34,197,94,0.2)]"
        }`}
      >
        {user.is_active
          ? t("admin.action_deactivate")
          : t("admin.action_activate")}
      </button>

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[var(--nps-glass-blur-sm)] flex items-center justify-center z-50">
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-[0_0_24px_var(--nps-glass-glow)]">
            <p className="text-[var(--nps-text)] mb-4">
              {confirmAction === "reset" &&
                t("admin.confirm_password_reset", {
                  username: user.username,
                })}
              {confirmAction === "deactivate" &&
                t("admin.confirm_deactivate", { username: user.username })}
              {confirmAction === "activate" &&
                t("admin.confirm_activate", { username: user.username })}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm bg-[var(--nps-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show temp password */}
      {tempPassword && confirmAction === null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[var(--nps-glass-blur-sm)] flex items-center justify-center z-50">
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-[0_0_24px_var(--nps-glass-glow)]">
            <p className="text-[var(--nps-text)] mb-2">
              {t("admin.password_reset_success", { password: tempPassword })}
            </p>
            <code className="block p-3 bg-black/30 backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-sm font-mono text-[var(--nps-text-bright)] mb-4 select-all">
              {tempPassword}
            </code>
            <button
              onClick={() => onResetPassword("")}
              className="w-full px-4 py-2 text-sm bg-[var(--nps-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
