import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { OracleConsultationForm } from "../OracleConsultationForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.multi_need_users":
          "Select at least 2 users for a multi-user reading.",
        "oracle.multi_select_hint": "Use the profile selector to add users.",
        "oracle.multi_user_title": "Multi-User Compatibility",
        "oracle.generating_reading": "Generating reading...",
        "oracle.submit_reading": "Submit Reading",
        "oracle.error_submit": "Failed to submit reading. Please try again.",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("../TimeReadingForm", () => ({
  default: () => <div data-testid="time-reading-form">TimeReadingForm</div>,
}));

vi.mock("../NameReadingForm", () => ({
  NameReadingForm: () => (
    <div data-testid="name-reading-form">NameReadingForm</div>
  ),
}));

vi.mock("../QuestionReadingForm", () => ({
  QuestionReadingForm: () => (
    <div data-testid="question-reading-form">QuestionReadingForm</div>
  ),
}));

vi.mock("../DailyReadingCard", () => ({
  default: () => <div data-testid="daily-reading-card">DailyReadingCard</div>,
}));

vi.mock("../MultiUserReadingDisplay", () => ({
  default: () => (
    <div data-testid="multi-user-display">MultiUserReadingDisplay</div>
  ),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn(), dismissToast: vi.fn(), toasts: [] }),
  ToastContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

vi.mock("@/hooks/useOracleReadings", () => ({
  useSubmitMultiUserReading: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

const defaultProps = {
  userId: 1,
  userName: "Alice",
  selectedUsers: null,
  onResult: vi.fn(),
  onLoadingChange: vi.fn(),
};

describe("OracleConsultationForm", () => {
  it("renders TimeReadingForm for type=time", () => {
    renderWithProviders(
      <OracleConsultationForm {...defaultProps} readingType="time" />,
    );
    expect(screen.getByTestId("time-reading-form")).toBeInTheDocument();
  });

  it("renders NameReadingForm for type=name", () => {
    renderWithProviders(
      <OracleConsultationForm {...defaultProps} readingType="name" />,
    );
    expect(screen.getByTestId("name-reading-form")).toBeInTheDocument();
  });

  it("renders QuestionReadingForm for type=question", () => {
    renderWithProviders(
      <OracleConsultationForm {...defaultProps} readingType="question" />,
    );
    expect(screen.getByTestId("question-reading-form")).toBeInTheDocument();
  });

  it("renders DailyReadingCard for type=daily", () => {
    renderWithProviders(
      <OracleConsultationForm {...defaultProps} readingType="daily" />,
    );
    expect(screen.getByTestId("daily-reading-card")).toBeInTheDocument();
  });

  it("shows need-users message for type=multi with no users", () => {
    renderWithProviders(
      <OracleConsultationForm {...defaultProps} readingType="multi" />,
    );
    expect(screen.getByTestId("multi-need-users")).toBeInTheDocument();
    expect(
      screen.getByText("Select at least 2 users for a multi-user reading."),
    ).toBeInTheDocument();
  });

  it("shows submit button for multi with enough users", () => {
    const users = {
      primary: {
        id: 1,
        name: "Alice",
        birthday: "1990-01-01",
        mother_name: "Eve",
      },
      secondary: [
        {
          id: 2,
          name: "Bob",
          birthday: "1991-02-02",
          mother_name: "Grace",
        },
      ],
    };
    renderWithProviders(
      <OracleConsultationForm
        {...defaultProps}
        readingType="multi"
        selectedUsers={users}
      />,
    );
    expect(screen.getByTestId("submit-multi-reading")).toBeInTheDocument();
    expect(screen.getByText("Submit Reading")).toBeInTheDocument();
  });

  it("shows user count in multi mode", () => {
    const users = {
      primary: {
        id: 1,
        name: "Alice",
        birthday: "1990-01-01",
        mother_name: "Eve",
      },
      secondary: [
        {
          id: 2,
          name: "Bob",
          birthday: "1991-02-02",
          mother_name: "Grace",
        },
      ],
    };
    renderWithProviders(
      <OracleConsultationForm
        {...defaultProps}
        readingType="multi"
        selectedUsers={users}
      />,
    );
    expect(screen.getByText(/2 users/)).toBeInTheDocument();
  });

  it("shows hint text in multi need-users view", () => {
    renderWithProviders(
      <OracleConsultationForm {...defaultProps} readingType="multi" />,
    );
    expect(
      screen.getByText("Use the profile selector to add users."),
    ).toBeInTheDocument();
  });
});
