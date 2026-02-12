import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadingTypeSelector } from "../ReadingTypeSelector";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.reading_type": "Reading Type",
        "oracle.type_time": "Time",
        "oracle.type_name": "Name",
        "oracle.type_question": "Question",
        "oracle.type_daily": "Daily",
        "oracle.type_multi": "Multi-User",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("ReadingTypeSelector", () => {
  it("renders all 5 reading type tabs", () => {
    render(<ReadingTypeSelector value="time" onChange={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
  });

  it("marks active type with aria-selected=true", () => {
    render(<ReadingTypeSelector value="name" onChange={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    const nameTab = tabs.find((t) => t.textContent?.includes("Name"));
    expect(nameTab).toHaveAttribute("aria-selected", "true");
    const timeTab = tabs.find((t) => t.textContent?.includes("Time"));
    expect(timeTab).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange when a different tab is clicked", async () => {
    const onChange = vi.fn();
    render(<ReadingTypeSelector value="time" onChange={onChange} />);
    const tabs = screen.getAllByRole("tab");
    const questionTab = tabs.find((t) => t.textContent?.includes("Question"));
    await userEvent.click(questionTab!);
    expect(onChange).toHaveBeenCalledWith("question");
  });

  it("disables all tabs when disabled prop is true", () => {
    render(<ReadingTypeSelector value="time" onChange={vi.fn()} disabled />);
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      expect(tab).toBeDisabled();
    });
  });

  it("has tablist role on the container", () => {
    render(<ReadingTypeSelector value="time" onChange={vi.fn()} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("sets aria-controls on each tab", () => {
    render(<ReadingTypeSelector value="time" onChange={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      expect(tab).toHaveAttribute("aria-controls", "oracle-form-panel");
    });
  });
});
