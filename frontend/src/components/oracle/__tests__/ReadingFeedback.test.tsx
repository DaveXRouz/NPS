import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/testUtils";
import { ReadingFeedback } from "../ReadingFeedback";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "feedback.rate_reading": "How was this reading?",
        "feedback.section_feedback": "Which sections were helpful?",
        "feedback.helpful": "helpful",
        "feedback.not_helpful": "not helpful",
        "feedback.text_placeholder": "Any additional thoughts?",
        "feedback.submit": "Submit Feedback",
        "feedback.submitting": "Submitting...",
        "feedback.thank_you": "Thank you for your feedback!",
        "feedback.error": "Failed to submit feedback.",
        "feedback.sections.simple": "Simple Reading",
        "feedback.sections.advice": "Advice",
        "feedback.sections.action_steps": "Action Steps",
        "feedback.sections.universe_message": "Universe Message",
      };
      if (key === "feedback.text_counter" && params) {
        return `${params.count}/1000`;
      }
      return map[key] ?? key;
    },
  }),
}));

const mockSubmit = vi.fn().mockResolvedValue({ id: 1, rating: 4 });

vi.mock("@/services/api", () => ({
  learning: {
    feedback: {
      submit: (...args: unknown[]) => mockSubmit(...args),
    },
  },
}));

describe("ReadingFeedback", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it("renders the feedback form", () => {
    renderWithProviders(<ReadingFeedback readingId={1} />);
    expect(screen.getByTestId("feedback-form")).toBeInTheDocument();
    expect(screen.getByText("How was this reading?")).toBeInTheDocument();
  });

  it("shows submit button disabled when no rating", () => {
    renderWithProviders(<ReadingFeedback readingId={1} />);
    const submitBtn = screen.getByTestId("feedback-submit");
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit after selecting a rating", async () => {
    renderWithProviders(<ReadingFeedback readingId={1} />);
    await userEvent.click(screen.getByTestId("star-4"));
    const submitBtn = screen.getByTestId("feedback-submit");
    expect(submitBtn).not.toBeDisabled();
  });

  it("shows all 4 section buttons", () => {
    renderWithProviders(<ReadingFeedback readingId={1} />);
    expect(screen.getByTestId("thumb-up-simple")).toBeInTheDocument();
    expect(screen.getByTestId("thumb-down-advice")).toBeInTheDocument();
    expect(screen.getByTestId("thumb-up-action_steps")).toBeInTheDocument();
    expect(
      screen.getByTestId("thumb-down-universe_message"),
    ).toBeInTheDocument();
  });

  it("submits feedback and shows thank you", async () => {
    renderWithProviders(<ReadingFeedback readingId={42} />);
    await userEvent.click(screen.getByTestId("star-5"));
    await userEvent.click(screen.getByTestId("feedback-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-thank-you")).toBeInTheDocument();
    });

    expect(mockSubmit).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        rating: 5,
      }),
    );
  });

  it("shows character counter for text feedback", async () => {
    renderWithProviders(<ReadingFeedback readingId={1} />);
    const textarea = screen.getByTestId("feedback-text");
    await userEvent.type(textarea, "hello");
    expect(screen.getByTestId("feedback-counter")).toHaveTextContent("5/1000");
  });
});
