import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { BackupManager } from "@/components/admin/BackupManager";
import type { BackupListResponse } from "@/types";

const mockBackups: BackupListResponse = {
  backups: [
    {
      filename: "oracle_full_20260214_120000.sql.gz",
      type: "oracle_full",
      timestamp: new Date().toISOString(),
      size_bytes: 1048576,
      size_human: "1.0 MB",
      tables: ["oracle_users", "oracle_readings"],
      database: "nps",
    },
    {
      filename: "nps_full_20260213_030000.sql.gz",
      type: "full_database",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      size_bytes: 52428800,
      size_human: "50.0 MB",
      tables: [],
      database: "nps",
    },
  ],
  total: 2,
  retention_policy: "Oracle: 30 days, Full: 60 days",
  backup_directory: "/app/backups",
};

// Use vi.hoisted so mock functions are available in vi.mock factory
const { mockBackupsFn, mockTriggerFn, mockRestoreFn, mockDeleteFn } =
  vi.hoisted(() => ({
    mockBackupsFn: vi.fn(),
    mockTriggerFn: vi.fn(),
    mockRestoreFn: vi.fn(),
    mockDeleteFn: vi.fn(),
  }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "admin.backup_manager": "Backup Manager",
        "admin.trigger_backup": "Create Backup",
        "admin.backup_in_progress": "Creating...",
        "admin.backup_type": "Type",
        "admin.backup_date": "Date",
        "admin.backup_size": "Size",
        "admin.backup_type_oracle_full": "Oracle Full",
        "admin.backup_type_oracle_data": "Oracle Data Only",
        "admin.backup_type_full_database": "Full Database",
        "admin.backup_schedule": "Automatic Backup Schedule",
        "admin.backup_schedule_daily": "Daily backup at midnight",
        "admin.backup_schedule_weekly": "Weekly backup on Sunday",
        "admin.backup_retention": "Retention policy",
        "admin.backup_success": "Backup created successfully",
        "admin.backup_failed": "Backup failed",
        "admin.restore_backup": "Restore",
        "admin.restore_success": "Restore completed",
        "admin.restore_failed": "Restore failed",
        "admin.restore_in_progress": "Restoring...",
        "admin.delete_backup": "Delete Backup",
        "admin.backup_confirm_restore_title": "Confirm Restore",
        "admin.backup_confirm_restore": "This will overwrite the database.",
        "admin.backup_confirm_restore_type": "Type RESTORE to confirm:",
        "admin.backup_confirm_delete": "Delete this backup?",
        "admin.no_backups": "No backups found",
        "admin.col_actions": "Actions",
        "common.loading": "Loading...",
        "common.cancel": "Cancel",
        "common.confirm": "Confirm",
        "common.delete": "Delete",
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock("@/services/api", () => ({
  admin: {
    backups: mockBackupsFn,
    triggerBackup: mockTriggerFn,
    restoreBackup: mockRestoreFn,
    deleteBackup: mockDeleteFn,
    listUsers: vi.fn(),
    getUser: vi.fn(),
    updateRole: vi.fn(),
    resetPassword: vi.fn(),
    updateStatus: vi.fn(),
    stats: vi.fn(),
    listProfiles: vi.fn(),
    deleteProfile: vi.fn(),
  },
  adminHealth: {
    detailed: vi.fn(),
    logs: vi.fn(),
    analytics: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockBackupsFn.mockResolvedValue(mockBackups);
  mockTriggerFn.mockResolvedValue({
    status: "success",
    message: "OK",
    backup: null,
  });
  mockRestoreFn.mockResolvedValue({
    status: "success",
    message: "Restored",
    rows_restored: {},
  });
  mockDeleteFn.mockResolvedValue({
    status: "success",
    message: "Deleted",
    filename: "test",
  });
});

describe("BackupManager", () => {
  it("renders the backup manager heading", async () => {
    renderWithProviders(<BackupManager />);
    expect(screen.getByText("Backup Manager")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    renderWithProviders(<BackupManager />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays backup entries after loading", async () => {
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(
        screen.getByText("oracle_full_20260214_120000.sql.gz"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("nps_full_20260213_030000.sql.gz"),
    ).toBeInTheDocument();
  });

  it("shows backup type badges", async () => {
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(screen.getByText("Oracle Full")).toBeInTheDocument();
    });
    expect(screen.getByText("Full DB")).toBeInTheDocument();
  });

  it("shows backup sizes", async () => {
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(screen.getByText("1.0 MB")).toBeInTheDocument();
    });
    expect(screen.getByText("50.0 MB")).toBeInTheDocument();
  });

  it("opens create backup menu on button click", async () => {
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(screen.getByText("Create Backup")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Create Backup"));
    // "Oracle Full" appears both in table badge and dropdown, so use getAllByText
    expect(screen.getAllByText("Oracle Full").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Oracle Data Only")).toBeInTheDocument();
    expect(screen.getByText("Full Database")).toBeInTheDocument();
  });

  it("opens restore confirmation dialog", async () => {
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(
        screen.getByText("oracle_full_20260214_120000.sql.gz"),
      ).toBeInTheDocument();
    });
    const restoreButtons = screen.getAllByText("Restore");
    fireEvent.click(restoreButtons[0]);
    expect(screen.getByText("Confirm Restore")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("RESTORE")).toBeInTheDocument();
  });

  it("disables confirm button until RESTORE is typed", async () => {
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(
        screen.getByText("oracle_full_20260214_120000.sql.gz"),
      ).toBeInTheDocument();
    });
    const restoreButtons = screen.getAllByText("Restore");
    fireEvent.click(restoreButtons[0]);

    const confirmBtn = screen.getByText("Confirm");
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByPlaceholderText("RESTORE");
    fireEvent.change(input, { target: { value: "RESTORE" } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it("opens delete confirmation dialog", async () => {
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(
        screen.getByText("oracle_full_20260214_120000.sql.gz"),
      ).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByText("Delete Backup");
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText("Delete this backup?")).toBeInTheDocument();
  });

  it("shows schedule info", async () => {
    renderWithProviders(<BackupManager />);
    expect(screen.getByText("Automatic Backup Schedule")).toBeInTheDocument();
  });

  it("shows no-backups message when empty", async () => {
    mockBackupsFn.mockResolvedValue({
      backups: [],
      total: 0,
      retention_policy: "Oracle: 30 days, Full: 60 days",
      backup_directory: "/app/backups",
    });
    renderWithProviders(<BackupManager />);
    await waitFor(() => {
      expect(screen.getByText("No backups found")).toBeInTheDocument();
    });
  });
});
