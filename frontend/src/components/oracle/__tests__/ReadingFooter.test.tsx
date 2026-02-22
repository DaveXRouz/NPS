import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingFooter } from "../ReadingFooter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.confidence_label": "Reading Confidence",
        "oracle.powered_by": "Powered by NPS Numerology Framework",
        "oracle.disclaimer":
          "This reading is for entertainment and personal reflection purposes only.",
        "oracle.generated_at": "Generated at",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

describe("ReadingFooter", () => {
  it("renders confidence bar at correct width", () => {
    render(<ReadingFooter confidence={75} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "75");
    expect(bar.style.width).toBe("75%");
  });

  it("shows disclaimer text", () => {
    render(<ReadingFooter confidence={50} />);
    expect(
      screen.getByText(
        "This reading is for entertainment and personal reflection purposes only.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Powered by NPS Numerology Framework"),
    ).toBeInTheDocument();
  });
});
