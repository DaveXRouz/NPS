import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin as adminApi } from "@/services/api";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { FadeIn } from "@/components/common/FadeIn";
import type {
  BackupInfo,
  BackupListResponse,
  BackupTriggerResponse,
  RestoreResponse,
  BackupDeleteResponse,
} from "@/types";

const TYPE_BADGE_COLORS: Record<string, string> = {
  oracle_full: "var(--nps-accent)",
  oracle_data: "#06b6d4",
  full_database: "#a855f7",
};

const DEFAULT_BADGE = {
  color: "var(--nps-status-unknown)",
};

export function BackupManager() {
  const { t } = useTranslation();
  const { formatRelativeTime, formatDateTime } = useFormattedDate();
  const queryClient = useQueryClient();

  const { data: backupList, isLoading } = useQuery<BackupListResponse>({
    queryKey: ["admin", "backups"],
    queryFn: () => adminApi.backups(),
    staleTime: 30_000,
  });

  const triggerBackup = useMutation<BackupTriggerResponse, Error, string>({
    mutationFn: (backupType: string) => adminApi.triggerBackup(backupType),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] }),
  });

  const restoreBackup = useMutation<RestoreResponse, Error, string>({
    mutationFn: (filename: string) => adminApi.restoreBackup(filename),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] }),
  });

  const deleteBackup = useMutation<BackupDeleteResponse, Error, string>({
    mutationFn: (filename: string) => adminApi.deleteBackup(filename),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] }),
  });

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Auto-dismiss status after 5s
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleTriggerBackup = async (backupType: string) => {
    setShowCreateMenu(false);
    try {
      const result = await triggerBackup.mutateAsync(backupType);
      if (result.status === "success") {
        setStatusMessage({ type: "success", text: t("admin.backup_success") });
      } else {
        setStatusMessage({
          type: "error",
          text: `${t("admin.backup_failed")}: ${result.message}`,
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: t("admin.backup_failed") });
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      const result = await restoreBackup.mutateAsync(restoreTarget);
      setRestoreTarget(null);
      setRestoreConfirmText("");
      if (result.status === "success") {
        setStatusMessage({
          type: "success",
          text: t("admin.restore_success"),
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `${t("admin.restore_failed")}: ${result.message}`,
        });
      }
    } catch {
      setRestoreTarget(null);
      setRestoreConfirmText("");
      setStatusMessage({ type: "error", text: t("admin.restore_failed") });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBackup.mutateAsync(deleteTarget);
      setDeleteTarget(null);
      setStatusMessage({
        type: "success",
        text: t("admin.delete_backup") + " - OK",
      });
    } catch {
      setDeleteTarget(null);
      setStatusMessage({ type: "error", text: t("admin.backup_failed") });
    }
  };

  const backups = backupList?.backups ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn delay={0}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--nps-text-bright)]">
            {t("admin.backup_manager")}
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              disabled={triggerBackup.isPending}
              className="px-4 py-2 bg-[var(--nps-accent)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_8px_var(--nps-glass-glow)]"
            >
              {triggerBackup.isPending
                ? t("admin.backup_in_progress")
                : t("admin.trigger_backup")}
            </button>
            {showCreateMenu && (
              <div className="absolute end-0 mt-2 w-52 bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl shadow-lg z-20 overflow-hidden">
                {[
                  {
                    type: "oracle_full",
                    label: t("admin.backup_type_oracle_full"),
                  },
                  {
                    type: "oracle_data",
                    label: t("admin.backup_type_oracle_data"),
                  },
                  {
                    type: "full_database",
                    label: t("admin.backup_type_full_database"),
                  },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => handleTriggerBackup(opt.type)}
                    className="w-full text-start px-4 py-3 text-sm text-[var(--nps-text)] hover:bg-[var(--nps-glass-glow)] transition-colors duration-150 border-b border-[var(--nps-glass-border)] last:border-b-0"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Status banner */}
      {statusMessage && (
        <FadeIn delay={0}>
          <div
            role="alert"
            className="px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-[var(--nps-glass-blur-sm)] border"
            style={{
              color:
                statusMessage.type === "success"
                  ? "var(--nps-status-healthy)"
                  : "var(--nps-status-unhealthy)",
              backgroundColor: `color-mix(in srgb, ${statusMessage.type === "success" ? "var(--nps-status-healthy)" : "var(--nps-status-unhealthy)"} 15%, transparent)`,
              borderColor: `color-mix(in srgb, ${statusMessage.type === "success" ? "var(--nps-status-healthy)" : "var(--nps-status-unhealthy)"} 30%, transparent)`,
            }}
          >
            {statusMessage.text}
          </div>
        </FadeIn>
      )}

      {/* Schedule info */}
      <FadeIn delay={80}>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4">
          <h3 className="text-sm font-medium text-[var(--nps-text-bright)] mb-2">
            {t("admin.backup_schedule")}
          </h3>
          <ul className="text-xs text-[var(--nps-text-dim)] space-y-1">
            <li>{t("admin.backup_schedule_daily")}</li>
            <li>{t("admin.backup_schedule_weekly")}</li>
          </ul>
          <p className="text-xs text-[var(--nps-text-dim)] mt-2">
            {t("admin.backup_retention")}:{" "}
            {backupList?.retention_policy ?? "Oracle: 30 days, Full: 60 days"}
          </p>
        </div>
      </FadeIn>

      {/* Backup table */}
      <FadeIn delay={160}>
        {isLoading ? (
          <div className="text-center py-8 text-[var(--nps-text-dim)]">
            {t("common.loading")}
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-[var(--nps-text-dim)] bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl">
            {t("admin.no_backups")}
          </div>
        ) : (
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--nps-glass-border)]">
                  <th className="text-start px-4 py-3 text-xs text-[var(--nps-text-dim)] font-medium">
                    {t("admin.backup_filename")}
                  </th>
                  <th className="text-start px-4 py-3 text-xs text-[var(--nps-text-dim)] font-medium">
                    {t("admin.backup_type")}
                  </th>
                  <th className="text-start px-4 py-3 text-xs text-[var(--nps-text-dim)] font-medium">
                    {t("admin.backup_date")}
                  </th>
                  <th className="text-start px-4 py-3 text-xs text-[var(--nps-text-dim)] font-medium">
                    {t("admin.backup_size")}
                  </th>
                  <th className="text-end px-4 py-3 text-xs text-[var(--nps-text-dim)] font-medium">
                    {t("admin.col_actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup: BackupInfo) => {
                  const badgeColor =
                    TYPE_BADGE_COLORS[backup.type] ?? DEFAULT_BADGE.color;
                  const badgeLabel = t(
                    `admin.backup_type_${backup.type}`,
                    backup.type,
                  );
                  return (
                    <tr
                      key={backup.filename}
                      className="border-b border-[var(--nps-glass-border)] last:border-b-0 hover:bg-[var(--nps-glass-glow)] transition-colors duration-150"
                    >
                      <td
                        className="px-4 py-3 text-[var(--nps-text)] truncate max-w-[200px]"
                        title={backup.filename}
                      >
                        {backup.filename}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-1 rounded-md text-xs font-medium border"
                          style={{
                            color: badgeColor,
                            backgroundColor: `color-mix(in srgb, ${badgeColor} 20%, transparent)`,
                            borderColor: `color-mix(in srgb, ${badgeColor} 30%, transparent)`,
                          }}
                        >
                          {badgeLabel}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-[var(--nps-text-dim)]"
                        title={formatDateTime(backup.timestamp)}
                      >
                        {formatRelativeTime(backup.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-[var(--nps-text-dim)]">
                        {backup.size_human}
                      </td>
                      <td className="px-4 py-3 text-end flex items-center justify-end gap-2">
                        <button
                          onClick={() => setRestoreTarget(backup.filename)}
                          disabled={restoreBackup.isPending}
                          className="px-2.5 py-1.5 text-xs border rounded-lg disabled:opacity-50 transition-all duration-200"
                          style={{
                            color: "var(--nps-status-degraded)",
                            backgroundColor:
                              "color-mix(in srgb, var(--nps-status-degraded) 15%, transparent)",
                            borderColor:
                              "color-mix(in srgb, var(--nps-status-degraded) 40%, transparent)",
                          }}
                        >
                          {t("admin.restore_backup")}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(backup.filename)}
                          disabled={deleteBackup.isPending}
                          className="px-2.5 py-1.5 text-xs border rounded-lg disabled:opacity-50 transition-all duration-200"
                          style={{
                            color: "var(--nps-status-unhealthy)",
                            backgroundColor:
                              "color-mix(in srgb, var(--nps-status-unhealthy) 15%, transparent)",
                            borderColor:
                              "color-mix(in srgb, var(--nps-status-unhealthy) 40%, transparent)",
                          }}
                        >
                          {t("admin.delete_backup")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FadeIn>

      {/* Restore confirmation modal */}
      {restoreTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)]"
          style={{ zIndex: "var(--nps-z-modal)" }}
        >
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-[0_0_24px_var(--nps-glass-glow)]">
            <h3 className="text-lg font-semibold text-[var(--nps-text-bright)] mb-2">
              {t("admin.backup_confirm_restore_title")}
            </h3>
            <p className="text-sm text-[var(--nps-text-dim)] mb-4">
              {t("admin.backup_confirm_restore")}
            </p>
            <p className="text-xs text-[var(--nps-text-dim)] mb-2">
              {t("admin.backup_confirm_restore_type")}
            </p>
            <input
              type="text"
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="RESTORE"
              className="nps-input-focus w-full px-3 py-2 bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-sm text-[var(--nps-text)] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRestoreTarget(null);
                  setRestoreConfirmText("");
                }}
                className="px-4 py-2 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleRestore}
                disabled={
                  restoreConfirmText !== "RESTORE" || restoreBackup.isPending
                }
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "var(--nps-status-degraded)" }}
              >
                {restoreBackup.isPending
                  ? t("admin.restore_in_progress")
                  : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)]"
          style={{ zIndex: "var(--nps-z-modal)" }}
        >
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-[0_0_24px_var(--nps-glass-glow)]">
            <h3 className="text-lg font-semibold text-[var(--nps-text-bright)] mb-2">
              {t("admin.delete_backup")}
            </h3>
            <p className="text-sm text-[var(--nps-text-dim)] mb-4">
              {t("admin.backup_confirm_delete")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-sm)] border border-[var(--nps-glass-border)] rounded-lg text-[var(--nps-text)] hover:border-[var(--nps-accent)]/40 hover:shadow-[0_0_4px_var(--nps-glass-glow)] transition-all duration-200"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteBackup.isPending}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "var(--nps-status-unhealthy)" }}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackupManager;
