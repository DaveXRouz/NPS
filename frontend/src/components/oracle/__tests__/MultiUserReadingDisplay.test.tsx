import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MultiUserReadingDisplay from "../MultiUserReadingDisplay";
import type { MultiUserFrameworkResponse } from "@/types";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.multi_user_title": "Multi-User Compatibility",
        "oracle.compatibility": "Compatibility",
        "oracle.group_harmony": "Group Harmony",
        "oracle.group_analysis": "Group Analysis",
        "oracle.strengths": "Strengths",
        "oracle.challenges": "Challenges",
        "oracle.fc60_stamp": "FC60 Stamp",
        "oracle.confidence": "Confidence",
        "oracle.element": "Element",
        "oracle.cosmic.ganzhi_title": "Chinese Zodiac",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

function makeResult(userCount: number): MultiUserFrameworkResponse {
  const individual = Array.from({ length: userCount }, (_, i) => ({
    id: i + 1,
    reading_type: "time",
    sign_value: `User ${i}`,
    framework_result: {},
    ai_interpretation: null,
    confidence: { score: 70, level: "high" },
    patterns: [],
    fc60_stamp: `STAMP-${i}`,
    numerology: null,
    moon: null,
    ganzhi: null,
    locale: "en",
    created_at: "2026-02-13T12:00:00",
  }));

  const pairwise = [];
  for (let i = 0; i < userCount; i++) {
    for (let j = i + 1; j < userCount; j++) {
      pairwise.push({
        user_a_name: `User ${i}`,
        user_b_name: `User ${j}`,
        user_a_id: i,
        user_b_id: j,
        overall_score: 0.72,
        overall_percentage: 72,
        classification: "Good",
        dimensions: {
          life_path: 80,
          element: 70,
          animal: 65,
          moon: 60,
          pattern: 55,
        },
        strengths: ["Complementary"],
        challenges: ["Different rhythms"],
        description: "Good match",
      });
    }
  }

  return {
    id: 100,
    user_count: userCount,
    pair_count: pairwise.length,
    computation_ms: 1000,
    individual_readings: individual,
    pairwise_compatibility: pairwise,
    group_analysis:
      userCount >= 3
        ? {
            group_harmony_score: 0.65,
            group_harmony_percentage: 65,
            element_balance: { Fire: 2, Water: 1 },
            animal_distribution: { Horse: 2, Rat: 1 },
            dominant_element: "Fire",
            dominant_animal: "Horse",
            group_summary: "Good group energy.",
          }
        : null,
    ai_interpretation: null,
    locale: "en",
    created_at: "2026-02-13T12:00:00",
  } as MultiUserFrameworkResponse;
}

describe("MultiUserReadingDisplay", () => {
  it("renders user tabs", () => {
    const result = makeResult(3);
    render(<MultiUserReadingDisplay result={result} />);

    expect(screen.getByTestId("user-tab-0")).toBeInTheDocument();
    expect(screen.getByTestId("user-tab-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-tab-2")).toBeInTheDocument();
  });

  it("renders compatibility grid", () => {
    const result = makeResult(2);
    render(<MultiUserReadingDisplay result={result} />);

    const grid = screen.getByTestId("compatibility-grid");
    expect(grid).toBeInTheDocument();
    // 2 users → cells at [0,1] and [1,0]
    expect(screen.getByTestId("cell-0-1")).toBeInTheDocument();
  });

  it("compatibility meter color coding", () => {
    const result = makeResult(2);
    render(<MultiUserReadingDisplay result={result} />);

    const cell = screen.getByTestId("cell-0-1");
    // 72% → green range
    expect(cell.textContent).toContain("72");
    expect(cell.className).toContain("nps-success");
  });

  it("group analysis visible for 3+ users", () => {
    // 2 users → no group analysis
    const result2 = makeResult(2);
    const { unmount } = render(<MultiUserReadingDisplay result={result2} />);
    expect(screen.queryByTestId("group-analysis")).not.toBeInTheDocument();
    unmount();

    // 3 users → has group analysis
    const result3 = makeResult(3);
    render(<MultiUserReadingDisplay result={result3} />);
    expect(screen.getByTestId("group-analysis")).toBeInTheDocument();
  });
});
