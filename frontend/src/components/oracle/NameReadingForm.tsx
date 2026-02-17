import { useState, lazy, Suspense, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { NameReading } from "@/types";
import { useSubmitName } from "@/hooks/useOracleReadings";
import { NumerologySystemSelector } from "./NumerologySystemSelector";

const PersianKeyboard = lazy(() =>
  import("./PersianKeyboard").then((m) => ({ default: m.PersianKeyboard })),
);
import type { NumerologySystem } from "@/utils/scriptDetector";

interface NameReadingFormProps {
  userId?: number;
  userName?: string;
  userNamePersian?: string;
  userMotherName?: string;
  userMotherNamePersian?: string;
  onResult: (result: NameReading) => void;
  onError?: (error: string) => void;
}

export function NameReadingForm({
  userId,
  userName,
  userNamePersian,
  userMotherName,
  userMotherNamePersian,
  onResult,
  onError,
}: NameReadingFormProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "fa";

  const [name, setName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showMotherKeyboard, setShowMotherKeyboard] = useState(false);
  const [numerologySystem, setNumerologySystem] =
    useState<NumerologySystem>("pythagorean");
  const [error, setError] = useState<string | null>(null);

  const mutation = useSubmitName();

  function handleKeyboardChar(char: string) {
    setName((prev) => prev + char);
  }

  function handleKeyboardBackspace() {
    setName((prev) => prev.slice(0, -1));
  }

  function handleMotherKeyboardChar(char: string) {
    setMotherName((prev) => prev + char);
  }

  function handleMotherKeyboardBackspace() {
    setMotherName((prev) => prev.slice(0, -1));
  }

  const handleUseProfileName = useCallback(() => {
    const profileName =
      i18n.language === "fa" && userNamePersian
        ? userNamePersian
        : userName || "";
    setName(profileName);
  }, [i18n.language, userName, userNamePersian]);

  const handleUseProfileMotherName = useCallback(() => {
    const profileMotherName =
      i18n.language === "fa" && userMotherNamePersian
        ? userMotherNamePersian
        : userMotherName || "";
    setMotherName(profileMotherName);
  }, [i18n.language, userMotherName, userMotherNamePersian]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = name.trim();
      if (!trimmedName) {
        const msg = t("oracle.error_name_required");
        setError(msg);
        return;
      }

      const trimmedMother = motherName.trim();
      if (trimmedMother && trimmedMother.length < 2) {
        const msg = t("oracle.error_mother_name_required");
        setError(msg);
        return;
      }

      setError(null);
      mutation.mutate(
        {
          name: trimmedName,
          motherName: trimmedMother || undefined,
          userId,
          system: numerologySystem,
        },
        {
          onSuccess: (data) => {
            onResult(data);
          },
          onError: (err) => {
            const msg =
              err instanceof Error ? err.message : t("oracle.error_submit");
            setError(msg);
            onError?.(msg);
          },
        },
      );
    },
    [
      name,
      motherName,
      userId,
      numerologySystem,
      mutation,
      onResult,
      onError,
      t,
    ],
  );

  const inputClasses =
    "w-full bg-[var(--nps-bg-input)] border border-[var(--nps-glass-border)] rounded-lg px-4 py-3 text-sm text-[var(--nps-text)] focus:outline-none focus:border-[var(--nps-accent)] focus:shadow-[0_0_8px_var(--nps-glass-glow)] transition-all duration-200 pe-10";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 text-start nps-animate-fade-in"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="name-reading-form"
    >
      <h3 className="text-lg font-semibold text-[var(--nps-text-bright)]">
        {t("oracle.name_reading_title")}
      </h3>

      {/* Section 1: Identity */}
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--nps-accent)]"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-xs font-medium text-[var(--nps-text-dim)] uppercase tracking-wider">
            {t("oracle.section_identity")}
          </span>
        </div>

        {/* Name input */}
        <div>
          <label
            htmlFor="name-input"
            className="block text-xs text-[var(--nps-text-dim)] mb-1.5"
          >
            {t("oracle.name_input_label")}
          </label>
          <div className="relative">
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("oracle.name_input_placeholder")}
              className={inputClasses}
              disabled={mutation.isPending}
              data-testid="name-input"
            />
            <button
              type="button"
              onClick={() => setShowKeyboard(!showKeyboard)}
              className="absolute top-3 end-3 w-6 h-6 flex items-center justify-center text-[var(--nps-text-dim)] hover:text-[var(--nps-accent)] transition-colors rounded"
              aria-label={t("oracle.keyboard_toggle")}
              title={t("oracle.keyboard_persian")}
              data-testid="keyboard-toggle"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
              </svg>
            </button>
          </div>
          {showKeyboard && (
            <Suspense
              fallback={
                <div className="h-32 animate-pulse bg-[var(--nps-bg-input)] rounded-lg mt-2" />
              }
            >
              <PersianKeyboard
                onCharacterClick={handleKeyboardChar}
                onBackspace={handleKeyboardBackspace}
                onClose={() => setShowKeyboard(false)}
              />
            </Suspense>
          )}
          {userName && (
            <button
              type="button"
              onClick={handleUseProfileName}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-full bg-[var(--nps-accent)]/10 text-[var(--nps-accent)] border border-[var(--nps-accent)]/20 hover:bg-[var(--nps-accent)]/20 transition-colors text-xs"
              data-testid="use-profile-name"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {t("oracle.use_profile_name")}
            </button>
          )}
        </div>

        {/* Mother's Name input */}
        <div>
          <label
            htmlFor="mother-name-input"
            className="block text-xs text-[var(--nps-text-dim)] mb-1.5"
          >
            {t("oracle.mother_name_input_label")}
          </label>
          <div className="relative">
            <input
              id="mother-name-input"
              type="text"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              placeholder={t("oracle.mother_name_input_placeholder")}
              className={inputClasses}
              disabled={mutation.isPending}
              data-testid="mother-name-input"
            />
            <button
              type="button"
              onClick={() => setShowMotherKeyboard(!showMotherKeyboard)}
              className="absolute top-3 end-3 w-6 h-6 flex items-center justify-center text-[var(--nps-text-dim)] hover:text-[var(--nps-accent)] transition-colors rounded"
              aria-label={t("oracle.keyboard_toggle")}
              title={t("oracle.keyboard_persian")}
              data-testid="mother-keyboard-toggle"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
              </svg>
            </button>
          </div>
          {showMotherKeyboard && (
            <Suspense
              fallback={
                <div className="h-32 animate-pulse bg-[var(--nps-bg-input)] rounded-lg mt-2" />
              }
            >
              <PersianKeyboard
                onCharacterClick={handleMotherKeyboardChar}
                onBackspace={handleMotherKeyboardBackspace}
                onClose={() => setShowMotherKeyboard(false)}
              />
            </Suspense>
          )}
          {userMotherName && (
            <button
              type="button"
              onClick={handleUseProfileMotherName}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-full bg-[var(--nps-accent)]/10 text-[var(--nps-accent)] border border-[var(--nps-accent)]/20 hover:bg-[var(--nps-accent)]/20 transition-colors text-xs"
              data-testid="use-profile-mother-name"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {t("oracle.use_profile_mother_name")}
            </button>
          )}
        </div>
      </div>

      {/* Section 2: Numerology System */}
      <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--nps-accent)]"
          >
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
          <span className="text-xs font-medium text-[var(--nps-text-dim)] uppercase tracking-wider">
            {t("oracle.section_system")}
          </span>
        </div>
        <NumerologySystemSelector
          value={numerologySystem}
          onChange={setNumerologySystem}
          userName={name || userName || ""}
          disabled={mutation.isPending}
        />
      </div>

      {/* Error display */}
      <div aria-live="polite">
        {error && (
          <p
            className="text-xs text-nps-bg-danger"
            role="alert"
            data-testid="name-error"
          >
            {error}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
        className="w-full rounded-lg bg-gradient-to-r from-[var(--nps-accent)] to-[var(--nps-accent-hover)] px-4 py-3 text-[var(--nps-bg)] font-medium hover:shadow-[0_0_16px_var(--nps-glass-glow)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
        data-testid="submit-name-reading"
      >
        {mutation.isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--nps-bg)] border-t-transparent" />
        )}
        {mutation.isPending
          ? t("oracle.generating_reading")
          : t("oracle.submit_name_reading")}
      </button>
    </form>
  );
}
