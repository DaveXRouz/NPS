import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { StarRating } from "../StarRating";

describe("StarRating", () => {
  it("renders 5 star buttons", () => {
    renderWithProviders(<StarRating value={0} />);
    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);
  });

  it("shows correct star as checked", () => {
    renderWithProviders(<StarRating value={3} />);
    const star3 = screen.getByTestId("star-3");
    expect(star3).toHaveAttribute("aria-checked", "true");
    const star4 = screen.getByTestId("star-4");
    expect(star4).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange when a star is clicked", async () => {
    const onChange = vi.fn();
    renderWithProviders(<StarRating value={0} onChange={onChange} />);
    await userEvent.click(screen.getByTestId("star-4"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("does not call onChange in readonly mode", async () => {
    const onChange = vi.fn();
    renderWithProviders(<StarRating value={3} onChange={onChange} readonly />);
    await userEvent.click(screen.getByTestId("star-2"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables buttons in readonly mode", () => {
    renderWithProviders(<StarRating value={3} readonly />);
    const star = screen.getByTestId("star-1");
    expect(star).toBeDisabled();
  });

  it("has proper aria labels", () => {
    renderWithProviders(<StarRating value={0} />);
    expect(screen.getByLabelText("1 star")).toBeInTheDocument();
    expect(screen.getByLabelText("3 stars")).toBeInTheDocument();
    expect(screen.getByLabelText("5 stars")).toBeInTheDocument();
  });
});
