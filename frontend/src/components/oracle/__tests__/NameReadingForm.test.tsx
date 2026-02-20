import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NameReadingForm } from "../NameReadingForm";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.name_reading_title": "Name Reading",
        "oracle.section_identity": "Identity",
        "oracle.section_system": "Numerology System",
        "oracle.name_input_label": "Enter a name",
        "oracle.name_input_placeholder": "Full name...",
        "oracle.mother_name_input_label": "Mother's Name",
        "oracle.mother_name_input_placeholder": "Mother's full name...",
        "oracle.use_profile_name": "Use Profile Name",
        "oracle.use_profile_mother_name": "Use Profile Mother's Name",
        "oracle.submit_name_reading": "Generate Name Reading",
        "oracle.generating_reading": "Generating reading...",
        "oracle.error_name_required": "Name must be at least 2 characters",
        "oracle.error_mother_name_required":
          "Mother's name must be at least 2 characters",
        "oracle.error_submit": "Failed to submit",
        "oracle.keyboard_toggle": "Toggle Persian keyboard",
        "oracle.keyboard_persian": "Persian Keyboard",
        "common.loading": "Loading...",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

// Mock API
const mockNameApi = vi.fn();
vi.mock("@/services/api", () => ({
  oracle: {
    name: (...args: unknown[]) => mockNameApi(...args),
  },
}));

// Mock NumerologySystemSelector
vi.mock("../NumerologySystemSelector", () => ({
  NumerologySystemSelector: () => <div data-testid="numerology-selector" />,
}));

// Mock PersianKeyboard
vi.mock("../PersianKeyboard", () => ({
  PersianKeyboard: ({
    onCharacterClick,
    onClose,
  }: {
    onCharacterClick: (c: string) => void;
    onBackspace: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="persian-keyboard">
      <button onClick={() => onCharacterClick("\u0633")}>س</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("NameReadingForm", () => {
  const onResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNameApi.mockResolvedValue({
      name: "Alice",
      expression: 8,
      soul_urge: 9,
      personality: 8,
    });
  });

  it("renders name input and submit button", () => {
    renderWithProviders(<NameReadingForm onResult={onResult} />);
    expect(screen.getByTestId("name-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-name-reading")).toBeInTheDocument();
    expect(screen.getByText("Name Reading")).toBeInTheDocument();
  });

  it("clicking Use Profile Name pre-fills input", () => {
    renderWithProviders(
      <NameReadingForm userName="Alice Johnson" onResult={onResult} />,
    );
    fireEvent.click(screen.getByTestId("use-profile-name"));
    const input = screen.getByTestId("name-input") as HTMLInputElement;
    expect(input.value).toBe("Alice Johnson");
  });

  it("submitting calls oracle.name with correct params", async () => {
    renderWithProviders(<NameReadingForm userId={1} onResult={onResult} />);

    const input = screen.getByTestId("name-input");
    fireEvent.change(input, { target: { value: "Alice" } });
    fireEvent.submit(screen.getByTestId("name-reading-form"));

    await waitFor(() => {
      expect(mockNameApi).toHaveBeenCalledWith(
        "Alice",
        1,
        "pythagorean",
        undefined,
        expect.any(AbortSignal),
      );
    });
  });

  it("empty name shows validation error", async () => {
    renderWithProviders(<NameReadingForm onResult={onResult} />);
    fireEvent.submit(screen.getByTestId("name-reading-form"));

    await waitFor(() => {
      expect(screen.getByTestId("name-error")).toBeInTheDocument();
    });
    expect(mockNameApi).not.toHaveBeenCalled();
  });

  it("keyboard toggle shows/hides PersianKeyboard", async () => {
    renderWithProviders(<NameReadingForm onResult={onResult} />);

    expect(screen.queryByTestId("persian-keyboard")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("keyboard-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("persian-keyboard")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("keyboard-toggle"));
    expect(screen.queryByTestId("persian-keyboard")).not.toBeInTheDocument();
  });
});
