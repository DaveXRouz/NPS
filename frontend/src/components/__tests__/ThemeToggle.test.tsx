import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../ThemeToggle";

const mockToggleTheme = vi.fn();
let mockResolvedTheme = "dark";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    toggleTheme: mockToggleTheme,
    theme: mockResolvedTheme,
    setTheme: vi.fn(),
  }),
}));

describe("ThemeToggle", () => {
  it("renders sun icon in dark mode", () => {
    mockResolvedTheme = "dark";
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // Sun icon has circle + lines
    const svgs = button.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
    expect(svgs[0].querySelector("circle")).toBeTruthy();
  });

  it("renders moon icon in light mode", () => {
    mockResolvedTheme = "light";
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    const svgs = button.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
    expect(svgs[0].querySelector("path")).toBeTruthy();
    expect(svgs[0].querySelector("circle")).toBeFalsy();
  });

  it("calls toggleTheme on click", async () => {
    mockResolvedTheme = "dark";
    mockToggleTheme.mockClear();
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it("has aria-label", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label");
  });
});
