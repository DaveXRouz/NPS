import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuestionReadingForm } from "../QuestionReadingForm";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "oracle.question_reading_title": "Question Reading",
        "oracle.question_input_label": "Ask your question",
        "oracle.question_input_placeholder": "Type your question here...",
        "oracle.submit_question_reading": "Get Answer",
        "oracle.error_question_empty": "Please enter a question",
        "oracle.error_submit": "Failed to submit",
        "oracle.keyboard_toggle": "Toggle Persian keyboard",
        "oracle.keyboard_persian": "Persian Keyboard",
        "oracle.script_latin": "English",
        "oracle.script_persian": "Persian",
        "oracle.script_mixed": "Mixed",
        "oracle.char_count": `${params?.current ?? 0}/${params?.max ?? 500} characters`,
        "oracle.detected_script": `Detected: ${params?.script ?? "English"}`,
        "common.loading": "Loading...",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

// Mock API
const mockQuestionApi = vi.fn();
vi.mock("@/services/api", () => ({
  oracle: {
    question: (...args: unknown[]) => mockQuestionApi(...args),
  },
}));

// Mock PersianKeyboard
vi.mock("../PersianKeyboard", () => ({
  PersianKeyboard: ({
    onClose,
  }: {
    onCharacterClick: (c: string) => void;
    onBackspace: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="persian-keyboard">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe("QuestionReadingForm", () => {
  const onResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuestionApi.mockResolvedValue({
      question: "Will I succeed?",
      question_number: 5,
      detected_script: "latin",
    });
  });

  it("renders textarea and submit button", () => {
    render(<QuestionReadingForm onResult={onResult} />);
    expect(screen.getByTestId("question-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-question-reading")).toBeInTheDocument();
    expect(screen.getByText("Question Reading")).toBeInTheDocument();
  });

  it("character counter updates as user types", () => {
    render(<QuestionReadingForm onResult={onResult} />);
    const textarea = screen.getByTestId("question-input");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    const counter = screen.getByTestId("char-counter");
    expect(counter.textContent).toContain("5/500");
  });

  it("maxLength prevents exceeding 500 characters", () => {
    render(<QuestionReadingForm onResult={onResult} />);
    const textarea = screen.getByTestId(
      "question-input",
    ) as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(500);
  });

  it("script detection badge shows English for latin input", () => {
    render(<QuestionReadingForm onResult={onResult} />);
    const textarea = screen.getByTestId("question-input");
    fireEvent.change(textarea, { target: { value: "Hello world" } });

    const badge = screen.getByTestId("script-badge");
    expect(badge.textContent).toContain("English");
  });

  it("submitting calls oracle.question with correct params", async () => {
    render(<QuestionReadingForm userId={1} onResult={onResult} />);

    const textarea = screen.getByTestId("question-input");
    fireEvent.change(textarea, { target: { value: "Will I succeed?" } });
    fireEvent.submit(screen.getByTestId("question-reading-form"));

    await waitFor(() => {
      expect(mockQuestionApi).toHaveBeenCalledWith(
        "Will I succeed?",
        1,
        "auto",
      );
    });
  });

  it("empty question shows validation error", async () => {
    render(<QuestionReadingForm onResult={onResult} />);
    fireEvent.submit(screen.getByTestId("question-reading-form"));

    await waitFor(() => {
      expect(screen.getByTestId("question-error")).toBeInTheDocument();
    });
    expect(mockQuestionApi).not.toHaveBeenCalled();
  });
});
