import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipNavLink } from "../SkipNavLink";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "a11y.skip_to_content": "Skip to content",
      };
      return map[key] || key;
    },
  }),
}));

describe("SkipNavLink", () => {
  it("renders skip link with correct href", () => {
    render(<SkipNavLink />);
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link.getAttribute("href")).toBe("#main-content");
  });

  it("skip link has skip-nav class for offscreen positioning", () => {
    render(<SkipNavLink />);
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link.classList.contains("skip-nav")).toBe(true);
  });

  it("skip link text comes from i18n", () => {
    render(<SkipNavLink />);
    expect(screen.getByText("Skip to content")).toBeDefined();
  });
});
