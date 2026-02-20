import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestionReadingForm } from "../QuestionReadingForm";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "oracle.question_reading_title": "Question Reading",
        "oracle.section_question_context": "Question Context",
        "oracle.section_question": "Your Question",
        "oracle.section_emotional_state": "Emotional State (Optional)",
        "oracle.section_system": "Numerology System",
        "oracle.category_label": "Question Category",
        "oracle.category_love": "Love",
        "oracle.category_career": "Career",
        "oracle.category_health": "Health",
        "oracle.category_finance": "Finance",
        "oracle.category_family": "Family",
        "oracle.category_spiritual": "Spiritual",
        "oracle.category_general": "General",
        "oracle.time_of_question_label": "When did this question arise?",
        "oracle.time_of_question_help":
          "The moment a question forms carries its own energy",
        "oracle.hour_label": "Hour",
        "oracle.minute_label": "Minute",
        "oracle.second_label": "Second",
        "oracle.use_current_time": "Use current time",
        "oracle.question_input_label": "What is your question?",
        "oracle.question_input_placeholder": "Ask about love, career...",
        "oracle.submit_question_reading": "Get Answer",
        "oracle.generating_reading": "Generating reading...",
        "oracle.error_question_empty": "Please enter a question",
        "oracle.error_question_too_short":
          "Question must be at least 10 characters",
        "oracle.error_submit": "Failed to submit",
        "oracle.keyboard_toggle": "Toggle Persian keyboard",
        "oracle.keyboard_persian": "Persian Keyboard",
        "oracle.script_latin": "English",
        "oracle.script_persian": "Persian",
        "oracle.script_mixed": "Mixed",
        "oracle.mood_label": "How are you feeling?",
        "oracle.mood_help":
          "Your emotional state helps provide more accurate guidance",
        "oracle.mood_calm": "Calm",
        "oracle.mood_anxious": "Anxious",
        "oracle.mood_curious": "Curious",
        "oracle.mood_desperate": "Desperate",
        "oracle.mood_none": "Prefer not to say",
        "oracle.question_char_count": `${params?.current ?? 0} / ${params?.max ?? 500}`,
        "oracle.question_char_progress": `${params?.percent ?? 0}% used`,
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

// Mock NumerologySystemSelector
vi.mock("../NumerologySystemSelector", () => ({
  NumerologySystemSelector: () => <div data-testid="numerology-selector" />,
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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("QuestionReadingForm", () => {
  const onResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuestionApi.mockResolvedValue({
      question: "Will I succeed in my career?",
      question_number: 5,
      detected_script: "latin",
    });
  });

  it("renders form sections and submit button", () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    expect(screen.getByTestId("question-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-question-reading")).toBeInTheDocument();
    expect(screen.getByText("Question Reading")).toBeInTheDocument();
    expect(screen.getByText("Question Context")).toBeInTheDocument();
    expect(screen.getByText("Your Question")).toBeInTheDocument();
  });

  it("renders category pills with General selected by default", () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    const generalBtn = screen.getByTestId("category-general");
    expect(generalBtn).toBeInTheDocument();
    expect(generalBtn.className).toContain("bg-[var(--nps-accent)]");
    expect(screen.getByTestId("category-love")).toBeInTheDocument();
    expect(screen.getByTestId("category-career")).toBeInTheDocument();
  });

  it("character counter updates as user types", () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    const textarea = screen.getByTestId("question-input");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    const counter = screen.getByTestId("char-counter");
    expect(counter.textContent).toContain("5 / 500");
  });

  it("maxLength prevents exceeding 500 characters", () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    const textarea = screen.getByTestId(
      "question-input",
    ) as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(500);
  });

  it("script detection badge shows English for latin input", () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    const textarea = screen.getByTestId("question-input");
    fireEvent.change(textarea, { target: { value: "Hello world" } });

    const badge = screen.getByTestId("script-badge");
    expect(badge.textContent).toContain("English");
  });

  it("submitting calls oracle.question with correct params", async () => {
    renderWithProviders(<QuestionReadingForm userId={1} onResult={onResult} />);

    const textarea = screen.getByTestId("question-input");
    fireEvent.change(textarea, {
      target: { value: "Will I succeed in my career?" },
    });
    fireEvent.submit(screen.getByTestId("question-reading-form"));

    await waitFor(() => {
      expect(mockQuestionApi).toHaveBeenCalledWith(
        "Will I succeed in my career?",
        1,
        "auto",
      );
    });
  });

  it("empty question shows validation error", async () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    fireEvent.submit(screen.getByTestId("question-reading-form"));

    await waitFor(() => {
      expect(screen.getByTestId("question-error")).toBeInTheDocument();
    });
    expect(mockQuestionApi).not.toHaveBeenCalled();
  });

  it("short question shows too-short error", async () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    const textarea = screen.getByTestId("question-input");
    fireEvent.change(textarea, { target: { value: "Short?" } });
    fireEvent.submit(screen.getByTestId("question-reading-form"));

    await waitFor(() => {
      const errorEl = screen.getByTestId("question-error");
      expect(errorEl.textContent).toContain("at least 10 characters");
    });
    expect(mockQuestionApi).not.toHaveBeenCalled();
  });

  it("category selection changes active pill", () => {
    renderWithProviders(<QuestionReadingForm onResult={onResult} />);
    const loveBtn = screen.getByTestId("category-love");
    fireEvent.click(loveBtn);
    expect(loveBtn.className).toContain("bg-[var(--nps-accent)]");
    const generalBtn = screen.getByTestId("category-general");
    expect(generalBtn.className).not.toContain(
      "bg-[var(--nps-accent)] text-[var(--nps-bg)]",
    );
  });
});
