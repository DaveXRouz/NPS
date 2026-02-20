import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { ReadingResults } from "../ReadingResults";
import type { ConsultationResult } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.tab_summary": "Summary",
        "oracle.tab_details": "Details",
        "oracle.tab_history": "History",
        "oracle.results_placeholder":
          "Results will appear here after a reading.",
        "oracle.details_placeholder":
          "Submit a reading to see detailed analysis.",
        "oracle.type_reading": "Reading",
        "oracle.element": "Element",
        "oracle.energy": "Energy",
        "oracle.life_path": "Life Path",
        "oracle.generated_at": "Generated at",
        "oracle.details_fc60": "FC60 Analysis",
        "oracle.details_numerology": "Numerology",
        "oracle.cycle": "Cycle",
        "oracle.polarity": "Polarity",
        "oracle.stem": "Stem",
        "oracle.branch": "Branch",
        "oracle.element_balance": "Element Balance",
        "oracle.day_vibration": "Day Vibration",
        "oracle.personal_year": "Personal Year",
        "oracle.personal_month": "Personal Month",
        "oracle.personal_day": "Personal Day",
        "oracle.filter_all": "All",
        "oracle.filter_reading": "Readings",
        "oracle.filter_question": "Questions",
        "oracle.filter_name": "Names",
        "oracle.history_empty": "No readings yet.",
        "oracle.error_history": "Failed to load reading history.",
        "oracle.export_and_share": "Export & Share",
        "oracle.export_text": "Export TXT",
        "oracle.export_json": "Export JSON",
        "oracle.translate": "Translate to Persian",
        "oracle.share": "Share",
        "oracle.copied": "Copied!",
        "oracle.current_reading": "Current Reading",
        "oracle.section_core_identity": "Core Identity",
        "oracle.section_right_now": "Right Now",
        "oracle.section_patterns": "Patterns & Synchronicities",
        "oracle.section_advice": "Today's Advice",
        "oracle.no_patterns": "No synchronicities detected",
        "oracle.confidence_label": "Reading Confidence",
        "oracle.powered_by": "Powered by NPS Numerology Framework",
        "oracle.disclaimer": "For entertainment purposes only.",
        "common.loading": "Loading...",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

vi.mock("@/services/api", () => ({
  oracle: {
    history: vi.fn().mockReturnValue(new Promise(() => {})),
  },
  translation: { translate: vi.fn() },
  share: {
    create: vi.fn(),
    get: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock("@/utils/exportReading", () => ({
  formatAsText: vi.fn(() => "formatted text"),
  exportAsPdf: vi.fn(() => Promise.resolve()),
  exportAsImage: vi.fn(() => Promise.resolve()),
  copyToClipboard: vi.fn(() => Promise.resolve(true)),
  downloadAsText: vi.fn(),
  downloadAsJson: vi.fn(),
}));

vi.mock("@/utils/shareReading", () => ({
  createShareLink: vi.fn(() =>
    Promise.resolve({
      token: "abc",
      url: "/share/abc",
      expires_at: null,
      created_at: "2026-01-01",
    }),
  ),
  getShareUrl: vi.fn(() => "http://localhost/share/abc"),
}));

const readingResult: ConsultationResult = {
  type: "reading",
  data: {
    fc60: {
      cycle: 1,
      element: "Wood",
      polarity: "Yang",
      stem: "Jia",
      branch: "Zi",
      year_number: 1,
      month_number: 2,
      day_number: 3,
      energy_level: 7,
      element_balance: { Wood: 3 },
    },
    numerology: {
      life_path: 5,
      day_vibration: 3,
      personal_year: 1,
      personal_month: 4,
      personal_day: 7,
      interpretation: "New beginnings",
    },
    zodiac: null,
    chinese: null,
    moon: null,
    angel: null,
    chaldean: null,
    ganzhi: null,
    fc60_extended: null,
    synchronicities: [],
    ai_interpretation: null,
    summary: "Test summary for reading",
    generated_at: "2024-01-01T12:00:00Z",
  },
};

describe("ReadingResults", () => {
  it("renders all three tabs", () => {
    renderWithProviders(<ReadingResults result={null} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("shows placeholder on summary tab by default", () => {
    renderWithProviders(<ReadingResults result={null} />);
    expect(
      screen.getByText("Results will appear here after a reading."),
    ).toBeInTheDocument();
  });

  it("switches to details tab on click", async () => {
    renderWithProviders(<ReadingResults result={null} />);
    await userEvent.click(screen.getByText("Details"));
    expect(
      screen.getByText("Submit a reading to see detailed analysis."),
    ).toBeInTheDocument();
  });

  it("shows result on summary tab", () => {
    renderWithProviders(<ReadingResults result={readingResult} />);
    expect(screen.getByText("Test summary for reading")).toBeInTheDocument();
  });

  it("shows export menu button when result exists", () => {
    renderWithProviders(<ReadingResults result={readingResult} />);
    expect(screen.getByText(/Export & Share/)).toBeInTheDocument();
  });

  it("does not show export menu when no result", () => {
    renderWithProviders(<ReadingResults result={null} />);
    expect(screen.queryByText(/Export & Share/)).not.toBeInTheDocument();
  });
});
