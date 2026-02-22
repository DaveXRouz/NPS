import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoadingAnimation } from "../LoadingAnimation";

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "oracle.progress_step": `Step ${params?.step ?? 0} of ${params?.total ?? 0}`,
        "oracle.loading_cancel": "Cancel",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

describe("LoadingAnimation", () => {
  it("renders progress message", () => {
    render(
      <LoadingAnimation
        step={1}
        total={5}
        message="Calculating numerology..."
      />,
    );
    expect(screen.getByText("Calculating numerology...")).toBeInTheDocument();
  });

  it("shows progress bar with correct width", () => {
    render(<LoadingAnimation step={2} total={4} message="Loading" />);
    const bar = screen.getByTestId("progress-bar");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("shows step counter when total > 0", () => {
    render(<LoadingAnimation step={3} total={5} message="Loading" />);
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
  });

  it("does not show step counter when total is 0", () => {
    render(<LoadingAnimation step={0} total={0} message="Loading" />);
    expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
  });

  it("shows cancel button when onCancel is provided", async () => {
    const onCancel = vi.fn();
    render(
      <LoadingAnimation
        step={1}
        total={5}
        message="Loading"
        onCancel={onCancel}
      />,
    );
    const cancelBtn = screen.getByTestId("cancel-button");
    expect(cancelBtn).toBeInTheDocument();
    await userEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not show cancel button when onCancel is not provided", () => {
    render(<LoadingAnimation step={1} total={5} message="Loading" />);
    expect(screen.queryByTestId("cancel-button")).not.toBeInTheDocument();
  });
});
