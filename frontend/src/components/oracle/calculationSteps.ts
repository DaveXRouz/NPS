import type { ReadingType } from "./ReadingTypeSelector";

export interface VisualStep {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  icon:
    | "clock"
    | "numerology"
    | "moon"
    | "ai"
    | "combine"
    | "name"
    | "question";
  backendStep: string;
}

const TIME_STEPS: VisualStep[] = [
  {
    id: "time-init",
    labelKey: "oracle.calc_step_time_init",
    icon: "clock",
    backendStep: "started",
  },
  {
    id: "time-numerology",
    labelKey: "oracle.calc_step_time_numerology",
    icon: "numerology",
    backendStep: "calculating",
  },
  {
    id: "time-ai",
    labelKey: "oracle.calc_step_ai",
    icon: "ai",
    backendStep: "ai_generating",
  },
  {
    id: "time-combine",
    labelKey: "oracle.calc_step_combine",
    icon: "combine",
    backendStep: "combining",
  },
];

const NAME_STEPS: VisualStep[] = [
  {
    id: "name-detect",
    labelKey: "oracle.calc_step_name_detect",
    icon: "name",
    backendStep: "started",
  },
  {
    id: "name-compute",
    labelKey: "oracle.calc_step_name_compute",
    icon: "numerology",
    backendStep: "calculating",
  },
  {
    id: "name-ai",
    labelKey: "oracle.calc_step_ai",
    icon: "ai",
    backendStep: "ai_generating",
  },
  {
    id: "name-combine",
    labelKey: "oracle.calc_step_combine",
    icon: "combine",
    backendStep: "combining",
  },
];

const QUESTION_STEPS: VisualStep[] = [
  {
    id: "question-vibration",
    labelKey: "oracle.calc_step_question_vibration",
    icon: "question",
    backendStep: "started",
  },
  {
    id: "question-patterns",
    labelKey: "oracle.calc_step_question_patterns",
    icon: "numerology",
    backendStep: "calculating",
  },
  {
    id: "question-ai",
    labelKey: "oracle.calc_step_ai",
    icon: "ai",
    backendStep: "ai_generating",
  },
  {
    id: "question-combine",
    labelKey: "oracle.calc_step_combine",
    icon: "combine",
    backendStep: "combining",
  },
];

const DAILY_STEPS: VisualStep[] = [
  {
    id: "daily-personal",
    labelKey: "oracle.calc_step_daily_personal",
    icon: "clock",
    backendStep: "started",
  },
  {
    id: "daily-moon",
    labelKey: "oracle.calc_step_daily_moon",
    icon: "moon",
    backendStep: "calculating",
  },
  {
    id: "daily-insights",
    labelKey: "oracle.calc_step_daily_insights",
    icon: "combine",
    backendStep: "combining",
  },
];

const MULTI_STEPS: VisualStep[] = [
  {
    id: "multi-profiles",
    labelKey: "oracle.calc_step_multi_profiles",
    icon: "numerology",
    backendStep: "started",
  },
  {
    id: "multi-compat",
    labelKey: "oracle.calc_step_multi_compat",
    icon: "combine",
    backendStep: "calculating",
  },
  {
    id: "multi-group",
    labelKey: "oracle.calc_step_multi_group",
    icon: "ai",
    backendStep: "ai_generating",
  },
  {
    id: "multi-final",
    labelKey: "oracle.calc_step_multi_final",
    icon: "combine",
    backendStep: "combining",
  },
];

const STEP_MAP: Record<ReadingType, VisualStep[]> = {
  time: TIME_STEPS,
  name: NAME_STEPS,
  question: QUESTION_STEPS,
  daily: DAILY_STEPS,
  multi: MULTI_STEPS,
};

export function getCalculationSteps(readingType: ReadingType): VisualStep[] {
  return STEP_MAP[readingType] ?? TIME_STEPS;
}

/**
 * Returns the index of the currently active visual step based on the backend step.
 * Steps before the active index are "completed", the active index is "active",
 * and steps after are "pending". When backendStep is "complete", returns steps.length
 * (all completed).
 */
export function getActiveStepIndex(
  steps: VisualStep[],
  backendStep: string,
): number {
  if (backendStep === "complete") return steps.length;
  // Find the last step that matches the backend step
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].backendStep === backendStep) return i;
  }
  return 0;
}
