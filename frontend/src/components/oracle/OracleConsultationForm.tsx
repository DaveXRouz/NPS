import { useState, useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { ReadingType } from "./ReadingTypeSelector";
import type {
  SelectedUsers,
  ConsultationResult,
  FrameworkReadingResponse,
  NameReading,
  QuestionReadingResult,
  OracleReading,
  MultiUserFrameworkRequest,
  GanzhiData,
} from "@/types";
import { useSubmitMultiUserReading } from "@/hooks/useOracleReadings";
import { useToast } from "@/hooks/useToast";
import { FadeIn } from "@/components/common/FadeIn";
import { LoadingOrb } from "@/components/common/LoadingOrb";
import TimeReadingForm from "./TimeReadingForm";
import { NameReadingForm } from "./NameReadingForm";
import { QuestionReadingForm } from "./QuestionReadingForm";
import DailyReadingCard from "./DailyReadingCard";
import MultiUserReadingDisplay from "./MultiUserReadingDisplay";

interface OracleConsultationFormProps {
  readingType: ReadingType;
  userId: number;
  userName: string;
  selectedUsers: SelectedUsers | null;
  onResult: (result: ConsultationResult) => void;
  onLoadingChange: (isLoading: boolean) => void;
  abortControllerRef?: RefObject<AbortController | null>;
}

function normalizeFrameworkResult(
  response: FrameworkReadingResponse,
  type: "reading" | "name" | "question",
): ConsultationResult {
  if (type === "reading") {
    const oracleReading: OracleReading = {
      fc60: null,
      numerology: response.numerology
        ? {
            life_path: response.numerology.life_path?.number ?? 0,
            life_path_title: response.numerology.life_path?.title ?? "",
            life_path_keywords: response.numerology.life_path?.message ?? "",
            day_vibration: response.numerology.personal_day,
            personal_year: response.numerology.personal_year,
            personal_month: response.numerology.personal_month,
            personal_day: response.numerology.personal_day,
            interpretation: response.ai_interpretation?.core_identity ?? "",
            expression: response.numerology.expression ?? 0,
            soul_urge: response.numerology.soul_urge ?? 0,
            personality: response.numerology.personality ?? 0,
          }
        : null,
      zodiac: null,
      chinese: null,
      moon: response.moon
        ? {
            phase_name: String(
              (response.moon as Record<string, unknown>).phase_name ?? "",
            ),
            illumination: Number(
              (response.moon as Record<string, unknown>).illumination ?? 0,
            ),
            age_days: Number(
              (response.moon as Record<string, unknown>).age ??
                (response.moon as Record<string, unknown>).age_days ??
                0,
            ),
            meaning: String(
              (response.moon as Record<string, unknown>).meaning ?? "",
            ),
            emoji: String(
              (response.moon as Record<string, unknown>).emoji ?? "",
            ),
            energy: String(
              (response.moon as Record<string, unknown>).energy ?? "",
            ),
            best_for: String(
              (response.moon as Record<string, unknown>).best_for ?? "",
            ),
            avoid: String(
              (response.moon as Record<string, unknown>).avoid ?? "",
            ),
          }
        : null,
      angel: null,
      chaldean: null,
      ganzhi: response.ganzhi as GanzhiData | null,
      fc60_extended: null,
      synchronicities: response.patterns.map((p) => p.message ?? p.type),
      ai_interpretation: response.ai_interpretation?.full_text ?? null,
      summary: response.ai_interpretation?.message ?? "",
      generated_at: response.created_at,
    };
    return { type: "reading", data: oracleReading };
  }
  if (type === "name") {
    const nameReading: NameReading = {
      name: response.sign_value,
      detected_script: "latin",
      numerology_system: "pythagorean",
      expression: response.numerology?.expression ?? 0,
      soul_urge: response.numerology?.soul_urge ?? 0,
      personality: response.numerology?.personality ?? 0,
      life_path: response.numerology?.life_path?.number ?? null,
      personal_year: response.numerology?.personal_year ?? null,
      fc60_stamp: null,
      moon: response.moon as Record<string, unknown> | null,
      ganzhi: response.ganzhi as Record<string, unknown> | null,
      patterns: null,
      confidence: response.confidence
        ? {
            score: response.confidence.score,
            level: response.confidence.level,
          }
        : null,
      ai_interpretation: response.ai_interpretation?.full_text ?? null,
      letter_breakdown: [],
      reading_id: response.id,
    };
    return { type: "name", data: nameReading };
  }
  // question type
  const questionResult: QuestionReadingResult = {
    question: response.sign_value,
    question_number: 0,
    detected_script: "latin",
    numerology_system: "auto",
    raw_letter_sum: 0,
    is_master_number: false,
    fc60_stamp: null,
    numerology: response.numerology as Record<string, unknown> | null,
    moon: response.moon as Record<string, unknown> | null,
    ganzhi: response.ganzhi as Record<string, unknown> | null,
    patterns: null,
    confidence: response.confidence
      ? {
          score: response.confidence.score,
          level: response.confidence.level,
        }
      : null,
    ai_interpretation: response.ai_interpretation?.full_text ?? null,
    reading_id: response.id,
  };
  return { type: "question", data: questionResult };
}

export function OracleConsultationForm({
  readingType,
  userId,
  userName,
  selectedUsers,
  onResult,
  onLoadingChange,
  abortControllerRef,
}: OracleConsultationFormProps) {
  switch (readingType) {
    case "time":
      return (
        <FadeIn key="time">
          <TimeReadingForm
            userId={userId}
            userName={userName}
            abortControllerRef={abortControllerRef}
            onLoadingChange={onLoadingChange}
            onResult={(response) => {
              onResult(normalizeFrameworkResult(response, "reading"));
              onLoadingChange(false);
            }}
          />
        </FadeIn>
      );
    case "name":
      return (
        <FadeIn key="name">
          <NameReadingForm
            userId={userId}
            userName={userName}
            userNamePersian={selectedUsers?.primary?.name_persian}
            userMotherName={selectedUsers?.primary?.mother_name}
            userMotherNamePersian={selectedUsers?.primary?.mother_name_persian}
            abortControllerRef={abortControllerRef}
            onLoadingChange={onLoadingChange}
            onResult={(data: NameReading) => {
              onResult({ type: "name", data });
              onLoadingChange(false);
            }}
          />
        </FadeIn>
      );
    case "question":
      return (
        <FadeIn key="question">
          <QuestionReadingForm
            userId={userId}
            abortControllerRef={abortControllerRef}
            onLoadingChange={onLoadingChange}
            onResult={(data: QuestionReadingResult) => {
              onResult({ type: "question", data });
              onLoadingChange(false);
            }}
          />
        </FadeIn>
      );
    case "daily":
      return (
        <FadeIn key="daily">
          <DailyReadingCard userId={userId} userName={userName} />
        </FadeIn>
      );
    case "multi":
      return (
        <FadeIn key="multi">
          <MultiUserFlow
            userId={userId}
            selectedUsers={selectedUsers}
            onResult={onResult}
            onLoadingChange={onLoadingChange}
          />
        </FadeIn>
      );
  }
}

interface MultiUserFlowProps {
  userId: number;
  selectedUsers: SelectedUsers | null;
  onResult: (result: ConsultationResult) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

function MultiUserFlow({ selectedUsers, onLoadingChange }: MultiUserFlowProps) {
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const mutation = useSubmitMultiUserReading();
  const [multiResult, setMultiResult] = useState<
    import("@/types").MultiUserFrameworkResponse | null
  >(null);

  const totalUsers = selectedUsers ? 1 + selectedUsers.secondary.length : 0;

  const handleSubmit = useCallback(() => {
    if (!selectedUsers || totalUsers < 2) return;
    const allIds = [
      selectedUsers.primary.id,
      ...selectedUsers.secondary.map((u) => u.id),
    ];
    const request: MultiUserFrameworkRequest = {
      user_ids: allIds,
      primary_user_index: 0,
      reading_type: "multi",
      locale: i18n.language,
      numerology_system: "auto",
      include_interpretation: true,
    };
    onLoadingChange(true);
    mutation.mutate(request, {
      onSuccess: (data) => {
        setMultiResult(data);
        onLoadingChange(false);
      },
      onError: (err) => {
        onLoadingChange(false);
        const errorMsg =
          err instanceof Error ? err.message : t("oracle.error_submit");
        addToast({ type: "error", message: errorMsg });
      },
    });
  }, [selectedUsers, totalUsers, i18n.language, mutation, onLoadingChange]);

  if (multiResult) {
    return <MultiUserReadingDisplay result={multiResult} />;
  }

  if (totalUsers < 2) {
    return (
      <div className="text-center py-6" data-testid="multi-need-users">
        <p className="text-sm text-[var(--nps-text-dim)]">
          {t("oracle.multi_need_users")}
        </p>
        <p className="text-xs text-[var(--nps-text-dim)] mt-1">
          {t("oracle.multi_select_hint")}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <p className="text-sm text-[var(--nps-text-dim)] mb-4">
        {t("oracle.multi_user_title")} ({totalUsers} users)
      </p>
      {mutation.isPending ? (
        <LoadingOrb label={t("common.loading_reading")} size="md" />
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="px-4 py-2 text-sm bg-[var(--nps-accent)] text-[var(--nps-bg)] font-medium rounded hover:bg-[var(--nps-accent)]/80 transition-colors disabled:opacity-50"
          data-testid="submit-multi-reading"
        >
          {t("oracle.submit_reading")}
        </button>
      )}
      {mutation.error && (
        <p className="text-xs text-red-500 mt-2" role="alert">
          {t("oracle.error_submit")}
        </p>
      )}
    </div>
  );
}
