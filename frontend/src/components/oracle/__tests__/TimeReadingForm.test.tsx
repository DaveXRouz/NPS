import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TimeReadingForm from "../TimeReadingForm";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "oracle.time_reading_title": "Time Reading",
        "oracle.hour_label": "Hour",
        "oracle.minute_label": "Minute",
        "oracle.second_label": "Second",
        "oracle.use_current_time": "Use current time",
        "oracle.generating_reading": "Generating reading...",
        "oracle.submit_reading": "Submit Reading",
        "oracle.consulting_for": `Consulting for ${params?.name ?? ""}`,
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

// Mock useOracleReadings hook
const mockMutate = vi.fn();
vi.mock("@/hooks/useOracleReadings", () => ({
  useSubmitTimeReading: () => ({
    mutate: mockMutate,
    isPending: false,
    data: null,
    error: null,
  }),
}));

// Mock OracleInquiry — renders a button that completes the inquiry with empty context
vi.mock("../OracleInquiry", () => ({
  default: ({
    onComplete,
  }: {
    onComplete: (ctx: Record<string, string>) => void;
  }) => (
    <button data-testid="inquiry-complete" onClick={() => onComplete({})}>
      Complete Inquiry
    </button>
  ),
}));

// Mock WebSocket
vi.stubGlobal(
  "WebSocket",
  vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    onmessage: null,
  })),
);

function renderForm(
  props?: Partial<React.ComponentProps<typeof TimeReadingForm>>,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const defaultProps = {
    userId: 1,
    userName: "Test User",
    onResult: vi.fn(),
    ...props,
  };
  return render(
    <QueryClientProvider client={qc}>
      <TimeReadingForm {...defaultProps} />
    </QueryClientProvider>,
  );
}

describe("TimeReadingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders time dropdowns", () => {
    renderForm();
    expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    expect(screen.getByLabelText("Minute")).toBeInTheDocument();
    expect(screen.getByLabelText("Second")).toBeInTheDocument();
  });

  it("hour dropdown has 24 options", () => {
    renderForm();
    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    expect(hourSelect.options.length).toBe(24);
  });

  it("minute dropdown has 60 options", () => {
    renderForm();
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;
    expect(minuteSelect.options.length).toBe(60);
  });

  it("second dropdown has 60 options", () => {
    renderForm();
    const secondSelect = screen.getByLabelText("Second") as HTMLSelectElement;
    expect(secondSelect.options.length).toBe(60);
  });

  it("use current time button fills dropdowns", () => {
    renderForm();
    const btn = screen.getByText("Use current time");
    fireEvent.click(btn);

    // After clicking, all selects should have values (exact values depend on
    // the current time, but they should be valid numbers)
    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    const h = Number(hourSelect.value);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
  });

  it("submit calls API with correct format", async () => {
    renderForm();

    // Set specific time
    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    fireEvent.change(hourSelect, { target: { value: "14" } });
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;
    fireEvent.change(minuteSelect, { target: { value: "30" } });
    const secondSelect = screen.getByLabelText("Second") as HTMLSelectElement;
    fireEvent.change(secondSelect, { target: { value: "0" } });

    // Submit — triggers inquiry flow
    const form = screen.getByText("Submit Reading").closest("form")!;
    fireEvent.submit(form);

    // Complete the inquiry step
    await waitFor(() => {
      expect(screen.getByTestId("inquiry-complete")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("inquiry-complete"));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const callArgs = mockMutate.mock.calls[0][0];
    expect(callArgs.user_id).toBe(1);
    expect(callArgs.reading_type).toBe("time");
    expect(callArgs.sign_value).toBe("14:30:00");
    expect(callArgs.locale).toBe("en");
    expect(callArgs.inquiry_context).toEqual({});
  });
});
