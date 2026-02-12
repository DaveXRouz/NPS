import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import Oracle from "../Oracle";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.user_profile": "User Profile",
        "oracle.reading_type": "Reading Type",
        "oracle.reading_results": "Reading Results",
        "oracle.select_profile": "Select profile",
        "oracle.no_profiles": "No profiles yet",
        "oracle.add_new_profile": "Add New Profile",
        "oracle.edit_profile": "Edit Profile",
        "oracle.select_to_begin": "Select a profile to begin readings.",
        "oracle.type_time_title": "Time Reading",
        "oracle.type_name_title": "Name Reading",
        "oracle.type_question_title": "Question Reading",
        "oracle.type_daily_title": "Daily Reading",
        "oracle.type_multi_title": "Multi-User Reading",
        "oracle.loading_generating": "Generating your reading…",
        "oracle.new_profile": "New Profile",
        "oracle.field_name": "Name",
        "oracle.field_name_persian": "Name (Persian)",
        "oracle.field_birthday": "Birthday",
        "oracle.field_mother_name": "Mother's Name",
        "oracle.field_mother_name_persian": "Mother's Name (Persian)",
        "oracle.field_country": "Country",
        "oracle.field_city": "City",
        "oracle.error_name_required": "Name must be at least 2 characters",
        "oracle.error_birthday_required": "Birthday is required",
        "oracle.error_mother_name_required":
          "Mother's name must be at least 2 characters",
        "oracle.delete_profile": "Delete",
        "oracle.delete_confirm": "Confirm Delete",
        "oracle.tab_summary": "Summary",
        "oracle.tab_details": "Details",
        "oracle.tab_history": "History",
        "oracle.results_placeholder":
          "Results will appear here after a reading.",
        "common.save": "Save",
        "common.cancel": "Cancel",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/components/oracle/ReadingTypeSelector", () => ({
  ReadingTypeSelector: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="reading-type-selector">
      <span data-testid="active-type">{value}</span>
      <button
        type="button"
        onClick={() => onChange("name")}
        data-testid="switch-to-name"
      >
        Switch to name
      </button>
    </div>
  ),
}));

vi.mock("@/components/oracle/OracleConsultationForm", () => ({
  OracleConsultationForm: ({ readingType }: { readingType: string }) => (
    <div data-testid="consultation-form">Form: {readingType}</div>
  ),
}));

vi.mock("@/components/oracle/LoadingAnimation", () => ({
  LoadingAnimation: () => <div data-testid="loading-animation">Loading...</div>,
}));

vi.mock("@/components/oracle/ReadingResults", () => ({
  ReadingResults: () => (
    <div data-testid="reading-results">Results placeholder</div>
  ),
}));

vi.mock("@/components/oracle/MultiUserSelector", () => ({
  MultiUserSelector: () => (
    <div data-testid="multi-user-selector">Multi selector</div>
  ),
}));

vi.mock("@/components/oracle/UserForm", () => ({
  UserForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="user-form">
      <span>New Profile</span>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("@/hooks/useOracleUsers", () => ({
  useOracleUsers: () => ({ data: [], isLoading: false }),
  useCreateOracleUser: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateOracleUser: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteOracleUser: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useReadingProgress", () => ({
  useReadingProgress: () => ({
    progress: {
      step: 0,
      total: 0,
      message: "",
      readingType: "",
      isActive: false,
    },
    startProgress: vi.fn(),
    resetProgress: vi.fn(),
  }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe("Oracle Page", () => {
  it("renders the user profile section", async () => {
    renderWithProviders(<Oracle />);
    await waitFor(() => {
      expect(screen.getByText("User Profile")).toBeInTheDocument();
    });
  });

  it("renders reading type selector", async () => {
    renderWithProviders(<Oracle />);
    await waitFor(() => {
      expect(screen.getByTestId("reading-type-selector")).toBeInTheDocument();
    });
  });

  it("defaults to time reading type", async () => {
    renderWithProviders(<Oracle />);
    await waitFor(() => {
      expect(screen.getByTestId("active-type")).toHaveTextContent("time");
    });
  });

  it("shows select-to-begin when no user is selected", async () => {
    renderWithProviders(<Oracle />);
    await waitFor(() => {
      expect(
        screen.getByText("Select a profile to begin readings."),
      ).toBeInTheDocument();
    });
  });

  it("renders reading results section", async () => {
    renderWithProviders(<Oracle />);
    await waitFor(() => {
      expect(screen.getByText("Reading Results")).toBeInTheDocument();
    });
    expect(screen.getByTestId("reading-results")).toBeInTheDocument();
  });

  it("opens create form when Add New Profile is clicked", async () => {
    renderWithProviders(<Oracle />);
    await waitFor(() => {
      expect(screen.getByText(/Add New Profile/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(screen.getByTestId("user-form")).toBeInTheDocument();
  });
});
