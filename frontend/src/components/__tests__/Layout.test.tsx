import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Layout } from "../Layout";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "layout.app_tagline": "Numerology Puzzle Solver",
        "layout.sidebar_collapse": "Collapse sidebar",
        "layout.sidebar_expand": "Expand sidebar",
        "layout.mobile_menu": "Open menu",
        "layout.footer_copyright": "NPS Project",
        "layout.version": "v4.0.0",
        "layout.theme_toggle": "Toggle theme",
        "layout.coming_soon": "Coming Soon",
        "nav.dashboard": "Dashboard",
        "nav.oracle": "Oracle",
        "nav.history": "Reading History",
        "nav.settings": "Settings",
        "nav.scanner": "Scanner",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    toggleTheme: vi.fn(),
    theme: "dark",
    setTheme: vi.fn(),
  }),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Layout />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Layout", () => {
  it("renders sidebar and content area", () => {
    renderLayout();
    expect(screen.getByText("NPS")).toBeInTheDocument();
    expect(screen.getByText("Numerology Puzzle Solver")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders top bar with toggles", () => {
    renderLayout();
    // LanguageToggle renders EN/FA
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("FA")).toBeInTheDocument();
    // ThemeToggle renders a button
    expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
  });

  it("renders footer with version", () => {
    renderLayout();
    expect(screen.getByText(/v4\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText(/NPS Project/)).toBeInTheDocument();
  });

  it("sidebar collapse toggle works", async () => {
    renderLayout();
    const collapseBtn = screen.getByLabelText("Collapse sidebar");
    await userEvent.click(collapseBtn);
    expect(localStorage.getItem("nps_sidebar_collapsed")).toBe("true");
  });

  it("mobile hamburger button exists", () => {
    renderLayout();
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("sidebar collapse persists to localStorage", async () => {
    renderLayout();
    const collapseBtn = screen.getByLabelText("Collapse sidebar");
    await userEvent.click(collapseBtn);
    expect(localStorage.getItem("nps_sidebar_collapsed")).toBe("true");
    // Click again
    const expandBtn = screen.getByLabelText("Expand sidebar");
    await userEvent.click(expandBtn);
    expect(localStorage.getItem("nps_sidebar_collapsed")).toBe("false");
  });
});
