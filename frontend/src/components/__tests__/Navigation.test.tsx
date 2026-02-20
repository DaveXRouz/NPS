import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Navigation } from "../Navigation";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "nav.dashboard": "Dashboard",
        "nav.oracle": "Oracle",
        "nav.history": "Reading History",
        "nav.settings": "Settings",
        "nav.admin": "Admin Panel",
        "layout.coming_soon": "Coming Soon",
      };
      return map[key] ?? key;
    },
  }),
}));

function renderNav(props: {
  collapsed?: boolean;
  isAdmin?: boolean;
  initialEntry?: string;
}) {
  return render(
    <MemoryRouter initialEntries={[props.initialEntry ?? "/dashboard"]}>
      <Navigation
        collapsed={props.collapsed ?? false}
        isAdmin={props.isAdmin ?? false}
      />
    </MemoryRouter>,
  );
}

describe("Navigation", () => {
  it("renders all public nav items", () => {
    renderNav({});
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Oracle")).toBeInTheDocument();
    expect(screen.getByText("Reading History")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("hides admin item when not admin", () => {
    renderNav({ isAdmin: false });
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });

  it("shows admin item when admin", () => {
    renderNav({ isAdmin: true });
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("active item has accent styling", () => {
    renderNav({ initialEntry: "/oracle" });
    const oracleLink = screen.getByText("Oracle").closest("a");
    expect(oracleLink?.className).toContain("text-[var(--nps-accent)]");
  });

  it("collapsed mode hides text labels", () => {
    renderNav({ collapsed: true });
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Oracle")).not.toBeInTheDocument();
  });

  it("collapsed mode shows tooltips via title", () => {
    renderNav({ collapsed: true });
    const nav = screen.getByRole("navigation");
    const links = nav.querySelectorAll("a");
    links.forEach((link) => {
      expect(link).toHaveAttribute("title");
    });
  });
});
