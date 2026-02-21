import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { InquiryQuestion, InquiryAnswer } from "@/types";
import { inquiryQuestionsMap } from "@/components/oracle/inquiryQuestions";

interface UseOracleInquiryReturn {
  questions: InquiryQuestion[];
  currentIndex: number;
  currentQuestion: InquiryQuestion | null;
  answers: InquiryAnswer[];
  selectOption: (optionId: string) => void;
  setFreeText: (text: string) => void;
  skipQuestion: () => void;
  next: () => void;
  back: () => void;
  isComplete: boolean;
  getInquiryContext: () => Record<string, string>;
  currentAnswer: InquiryAnswer | null;
}

export function useOracleInquiry(readingType: string): UseOracleInquiryReturn {
  const { t } = useTranslation();
  const questions = useMemo(
    () => inquiryQuestionsMap[readingType] ?? [],
    [readingType],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<InquiryAnswer[]>(() =>
    questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: null,
      freeText: null,
      skipped: false,
    })),
  );

  const currentQuestion =
    currentIndex < questions.length ? questions[currentIndex] : null;

  const currentAnswer =
    currentIndex < answers.length ? answers[currentIndex] : null;

  const selectOption = useCallback(
    (optionId: string) => {
      setAnswers((prev) =>
        prev.map((a, i) =>
          i === currentIndex
            ? {
                ...a,
                selectedOptionId: optionId,
                freeText: null,
                skipped: false,
              }
            : a,
        ),
      );
    },
    [currentIndex],
  );

  const setFreeText = useCallback(
    (text: string) => {
      setAnswers((prev) =>
        prev.map((a, i) =>
          i === currentIndex
            ? {
                ...a,
                freeText: text || null,
                selectedOptionId: null,
                skipped: false,
              }
            : a,
        ),
      );
    },
    [currentIndex],
  );

  const skipQuestion = useCallback(() => {
    setAnswers((prev) =>
      prev.map((a, i) =>
        i === currentIndex
          ? { ...a, skipped: true, selectedOptionId: null, freeText: null }
          : a,
      ),
    );
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length));
  }, [currentIndex, questions.length]);

  const next = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length));
  }, [questions.length]);

  const back = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const isComplete = currentIndex >= questions.length;

  const getInquiryContext = useCallback((): Record<string, string> => {
    const context: Record<string, string> = {};
    for (const answer of answers) {
      if (answer.skipped) continue;
      if (answer.freeText) {
        context[answer.questionId] = answer.freeText;
      } else if (answer.selectedOptionId) {
        const question = questions.find((q) => q.id === answer.questionId);
        const option = question?.options.find(
          (o) => o.id === answer.selectedOptionId,
        );
        if (option) {
          context[answer.questionId] = t(option.labelKey);
        }
      }
    }
    return context;
  }, [answers, questions, t]);

  return {
    questions,
    currentIndex,
    currentQuestion,
    answers,
    selectOption,
    setFreeText,
    skipQuestion,
    next,
    back,
    isComplete,
    getInquiryContext,
    currentAnswer,
  };
}
