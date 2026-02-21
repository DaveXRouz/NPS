import type { InquiryQuestion } from "@/types";

const questionReadingQuestions: InquiryQuestion[] = [
  {
    id: "emotional_state",
    promptKey: "oracle.inquiry_question_emotional_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "calm",
        emoji: "\uD83E\uDDD8",
        labelKey: "oracle.inquiry_calm_label",
        descKey: "oracle.inquiry_calm_desc",
      },
      {
        id: "anxious",
        emoji: "\uD83D\uDE30",
        labelKey: "oracle.inquiry_anxious_label",
        descKey: "oracle.inquiry_anxious_desc",
      },
      {
        id: "curious",
        emoji: "\uD83D\uDD2E",
        labelKey: "oracle.inquiry_curious_label",
        descKey: "oracle.inquiry_curious_desc",
      },
      {
        id: "heavy",
        emoji: "\uD83D\uDCAB",
        labelKey: "oracle.inquiry_heavy_label",
        descKey: "oracle.inquiry_heavy_desc",
      },
    ],
  },
  {
    id: "urgency",
    promptKey: "oracle.inquiry_question_urgency_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "just_curious",
        emoji: "\uD83E\uDD14",
        labelKey: "oracle.inquiry_just_curious_label",
        descKey: "oracle.inquiry_just_curious_desc",
      },
      {
        id: "seeking_clarity",
        emoji: "\uD83D\uDCA1",
        labelKey: "oracle.inquiry_seeking_clarity_label",
        descKey: "oracle.inquiry_seeking_clarity_desc",
      },
      {
        id: "need_guidance",
        emoji: "\uD83E\uDDED",
        labelKey: "oracle.inquiry_need_guidance_label",
        descKey: "oracle.inquiry_need_guidance_desc",
      },
      {
        id: "crossroads",
        emoji: "\u2694\uFE0F",
        labelKey: "oracle.inquiry_crossroads_label",
        descKey: "oracle.inquiry_crossroads_desc",
      },
    ],
  },
  {
    id: "desired_outcome",
    promptKey: "oracle.inquiry_question_outcome_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "direct",
        emoji: "\uD83C\uDFAF",
        labelKey: "oracle.inquiry_direct_label",
        descKey: "oracle.inquiry_direct_desc",
      },
      {
        id: "deep",
        emoji: "\uD83C\uDF0A",
        labelKey: "oracle.inquiry_deep_label",
        descKey: "oracle.inquiry_deep_desc",
      },
      {
        id: "practical",
        emoji: "\uD83D\uDEE0\uFE0F",
        labelKey: "oracle.inquiry_practical_label",
        descKey: "oracle.inquiry_practical_desc",
      },
      {
        id: "reassuring",
        emoji: "\uD83E\uDD17",
        labelKey: "oracle.inquiry_reassuring_label",
        descKey: "oracle.inquiry_reassuring_desc",
      },
    ],
  },
];

const nameReadingQuestions: InquiryQuestion[] = [
  {
    id: "name_relationship",
    promptKey: "oracle.inquiry_name_relationship_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "my_own",
        emoji: "\uD83D\uDE4B",
        labelKey: "oracle.inquiry_my_own_label",
        descKey: "oracle.inquiry_my_own_desc",
      },
      {
        id: "loved_one",
        emoji: "\u2764\uFE0F",
        labelKey: "oracle.inquiry_loved_one_label",
        descKey: "oracle.inquiry_loved_one_desc",
      },
      {
        id: "project",
        emoji: "\uD83D\uDCBC",
        labelKey: "oracle.inquiry_project_label",
        descKey: "oracle.inquiry_project_desc",
      },
      {
        id: "curious_about",
        emoji: "\uD83E\uDD14",
        labelKey: "oracle.inquiry_curious_about_label",
        descKey: "oracle.inquiry_curious_about_desc",
      },
    ],
  },
  {
    id: "intent",
    promptKey: "oracle.inquiry_name_intent_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "hidden_strengths",
        emoji: "\uD83D\uDCAA",
        labelKey: "oracle.inquiry_hidden_strengths_label",
        descKey: "oracle.inquiry_hidden_strengths_desc",
      },
      {
        id: "life_purpose",
        emoji: "\u2728",
        labelKey: "oracle.inquiry_life_purpose_label",
        descKey: "oracle.inquiry_life_purpose_desc",
      },
      {
        id: "compatibility",
        emoji: "\uD83E\uDD1D",
        labelKey: "oracle.inquiry_compatibility_label",
        descKey: "oracle.inquiry_compatibility_desc",
      },
      {
        id: "general_energy",
        emoji: "\uD83C\uDF1F",
        labelKey: "oracle.inquiry_general_energy_label",
        descKey: "oracle.inquiry_general_energy_desc",
      },
    ],
  },
];

const timeReadingQuestions: InquiryQuestion[] = [
  {
    id: "moment_significance",
    promptKey: "oracle.inquiry_time_significance_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "right_now",
        emoji: "\u23F0",
        labelKey: "oracle.inquiry_right_now_label",
        descKey: "oracle.inquiry_right_now_desc",
      },
      {
        id: "decision_point",
        emoji: "\u2696\uFE0F",
        labelKey: "oracle.inquiry_decision_point_label",
        descKey: "oracle.inquiry_decision_point_desc",
      },
      {
        id: "memory",
        emoji: "\uD83D\uDCDA",
        labelKey: "oracle.inquiry_memory_label",
        descKey: "oracle.inquiry_memory_desc",
      },
      {
        id: "planned_event",
        emoji: "\uD83D\uDCC5",
        labelKey: "oracle.inquiry_planned_event_label",
        descKey: "oracle.inquiry_planned_event_desc",
      },
    ],
  },
  {
    id: "focus_area",
    promptKey: "oracle.inquiry_time_focus_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "personal_growth",
        emoji: "\uD83C\uDF31",
        labelKey: "oracle.inquiry_personal_growth_label",
        descKey: "oracle.inquiry_personal_growth_desc",
      },
      {
        id: "relationships",
        emoji: "\uD83D\uDC9E",
        labelKey: "oracle.inquiry_relationships_label",
        descKey: "oracle.inquiry_relationships_desc",
      },
      {
        id: "career",
        emoji: "\uD83D\uDE80",
        labelKey: "oracle.inquiry_career_label",
        descKey: "oracle.inquiry_career_desc",
      },
      {
        id: "general_guidance",
        emoji: "\uD83C\uDF1F",
        labelKey: "oracle.inquiry_general_guidance_label",
        descKey: "oracle.inquiry_general_guidance_desc",
      },
    ],
  },
];

const dailyReadingQuestions: InquiryQuestion[] = [
  {
    id: "morning_intention",
    promptKey: "oracle.inquiry_daily_intention_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "productivity",
        emoji: "\u26A1",
        labelKey: "oracle.inquiry_productivity_label",
        descKey: "oracle.inquiry_productivity_desc",
      },
      {
        id: "connection",
        emoji: "\uD83E\uDD1D",
        labelKey: "oracle.inquiry_connection_label",
        descKey: "oracle.inquiry_connection_desc",
      },
      {
        id: "rest",
        emoji: "\uD83C\uDF3F",
        labelKey: "oracle.inquiry_rest_label",
        descKey: "oracle.inquiry_rest_desc",
      },
      {
        id: "adventure",
        emoji: "\uD83C\uDF0D",
        labelKey: "oracle.inquiry_adventure_label",
        descKey: "oracle.inquiry_adventure_desc",
      },
    ],
  },
  {
    id: "energy_level",
    promptKey: "oracle.inquiry_daily_energy_prompt",
    allowFreeText: true,
    freeTextPlaceholderKey: "oracle.inquiry_freetext_placeholder",
    options: [
      {
        id: "well_rested",
        emoji: "\u2600\uFE0F",
        labelKey: "oracle.inquiry_well_rested_label",
        descKey: "oracle.inquiry_well_rested_desc",
      },
      {
        id: "tired_willing",
        emoji: "\uD83C\uDF24\uFE0F",
        labelKey: "oracle.inquiry_tired_willing_label",
        descKey: "oracle.inquiry_tired_willing_desc",
      },
      {
        id: "uncertain",
        emoji: "\uD83C\uDF2B\uFE0F",
        labelKey: "oracle.inquiry_uncertain_label",
        descKey: "oracle.inquiry_uncertain_desc",
      },
      {
        id: "energized",
        emoji: "\uD83D\uDD25",
        labelKey: "oracle.inquiry_energized_label",
        descKey: "oracle.inquiry_energized_desc",
      },
    ],
  },
];

export const inquiryQuestionsMap: Record<string, InquiryQuestion[]> = {
  question: questionReadingQuestions,
  name: nameReadingQuestions,
  time: timeReadingQuestions,
  daily: dailyReadingQuestions,
};
