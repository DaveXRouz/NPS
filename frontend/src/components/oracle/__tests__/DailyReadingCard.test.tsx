import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DailyReadingCard from "../DailyReadingCard";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "oracle.daily_reading_title": "Today's Reading",
        "oracle.consulting_for": `Consulting for ${params?.name ?? ""}`,
        "oracle.no_daily_reading": "No daily reading generated yet.",
        "oracle.generate_daily": "Generate Today's Reading",
        "oracle.generating_reading": "Generating reading...",
        "oracle.daily_energy_forecast": "Energy Forecast",
        "oracle.daily_lucky_hours": "Lucky Hours",
        "oracle.daily_activities": "Suggested Activities",
        "oracle.daily_focus": "Focus Area",
        "oracle.daily_element": "Element of the Day",
        "oracle.date_label": "Date",
        "oracle.view_full_reading": "View Full Reading",
        "oracle.error_submit": "Failed to submit reading.",
        "oracle.regenerate": "Regenerate",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

// Track hook return values
let dailyReadingData: ReturnType<typeof mockDailyQuery>;
let generateMutationData: ReturnType<typeof mockGenerateMutation>;

function mockDailyQuery() {
  return {
    data: null as {
      reading:
        | (Record<string, unknown> & {
            daily_insights?: {
              energy_forecast: string;
              lucky_hours: number[];
              suggested_activities: string[];
              focus_area: string;
              element_of_day: string;
            };
          })
        | null;
      cached: boolean;
    } | null,
    isLoading: false,
    error: null,
  };
}

function mockGenerateMutation() {
  return {
    mutate: vi.fn(),
    isPending: false,
    error: null,
    data: null,
  };
}

vi.mock("@/hooks/useOracleReadings", () => ({
  useDailyReading: () => dailyReadingData,
  useGenerateDailyReading: () => generateMutationData,
}));

function renderCard(
  props?: Partial<React.ComponentProps<typeof DailyReadingCard>>,
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <DailyReadingCard userId={1} userName="Test User" {...props} />
    </QueryClientProvider>,
  );
}

describe("DailyReadingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dailyReadingData = mockDailyQuery();
    generateMutationData = mockGenerateMutation();
  });

  it("renders card title", () => {
    renderCard();
    expect(screen.getByText("Today's Reading")).toBeInTheDocument();
  });

  it("shows generate button when no reading", () => {
    renderCard();
    expect(screen.getByTestId("generate-daily-btn")).toBeInTheDocument();
    expect(screen.getByText("Generate Today's Reading")).toBeInTheDocument();
  });

  it("shows daily insights after generation", () => {
    dailyReadingData.data = {
      reading: {
        id: 1,
        reading_type: "daily",
        sign_value: "2026-02-13",
        fc60_stamp: "STAMP",
        confidence: { score: 72, level: "high" },
        patterns: [],
        framework_result: {},
        ai_interpretation: null,
        numerology: null,
        moon: null,
        ganzhi: null,
        locale: "en",
        created_at: "2026-02-13T12:00:00",
        daily_insights: {
          energy_forecast: "Stable energy",
          lucky_hours: [9, 14],
          suggested_activities: ["Meditation"],
          focus_area: "Relationships",
          element_of_day: "Fire",
        },
      },
      cached: true,
    };

    renderCard();
    expect(screen.getByText("Stable energy")).toBeInTheDocument();
    expect(screen.getByText("9:00, 14:00")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    dailyReadingData.isLoading = true;
    renderCard();
    expect(screen.getByTestId("daily-loading")).toBeInTheDocument();
  });
});
