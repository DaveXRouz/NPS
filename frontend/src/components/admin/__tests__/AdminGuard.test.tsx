import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import { AdminGuard } from "../AdminGuard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "admin.forbidden_title": "Access Denied",
        "admin.forbidden_message":
          "You need admin privileges to access this page.",
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Admin Content</div>,
  };
});

const mockDetailed = vi.fn();
vi.mock("@/services/api", () => ({
  adminHealth: {
    detailed: () => mockDetailed(),
  },
}));

describe("AdminGuard", () => {
  beforeEach(() => {
    localStorage.clear();
    mockDetailed.mockReset();
  });

  it("renders outlet when API confirms admin", async () => {
    localStorage.setItem("nps_user_role", "admin");
    mockDetailed.mockResolvedValue({ status: "healthy" });
    renderWithProviders(<AdminGuard />);
    await waitFor(() => {
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });
  });

  it("renders forbidden message when API rejects", async () => {
    localStorage.setItem("nps_user_role", "admin");
    mockDetailed.mockRejectedValue(new Error("Unauthorized"));
    renderWithProviders(<AdminGuard />);
    await waitFor(() => {
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });
  });

  it("renders forbidden message when no role is set", async () => {
    mockDetailed.mockRejectedValue(new Error("Unauthorized"));
    renderWithProviders(<AdminGuard />);
    await waitFor(() => {
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });
  });
});
