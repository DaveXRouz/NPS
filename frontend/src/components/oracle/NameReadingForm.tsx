import { useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import type { NameReading } from "@/types";
import { oracle } from "@/services/api";
import { NumerologySystemSelector } from "./NumerologySystemSelector";

const PersianKeyboard = lazy(() =>
  import("./PersianKeyboard").then((m) => ({ default: m.PersianKeyboard })),
);
import type { NumerologySystem } from "@/utils/scriptDetector";

interface NameReadingFormProps {
  userId?: number;
  userName?: string;
  userNamePersian?: string;
  onResult: (result: NameReading) => void;
  onError?: (error: string) => void;
}

export function NameReadingForm({
  userId,
  userName,
  userNamePersian,
  onResult,
  onError,
}: NameReadingFormProps) {
  const { t, i18n } = useTranslation();

  const [name, setName] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [numerologySystem, setNumerologySystem] =
    useState<NumerologySystem>("pythagorean");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleKeyboardChar(char: string) {
    setName((prev) => prev + char);
  }

  function handleKeyboardBackspace() {
    setName((prev) => prev.slice(0, -1));
  }

  function handleUseProfileName() {
    const profileName =
      i18n.language === "fa" && userNamePersian
        ? userNamePersian
        : userName || "";
    setName(profileName);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      const msg = t("oracle.error_name_required");
      setError(msg);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = await oracle.name(trimmed, userId, numerologySystem);
      onResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("oracle.error_submit");
      setError(msg);
      onError?.(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="name-reading-form"
    >
      <h3 className="text-sm font-medium text-nps-text">
        {t("oracle.name_reading_title")}
      </h3>

      {/* Name input with keyboard toggle */}
      <div className="relative">
        <label className="block text-sm text-nps-text-dim mb-1">
          {t("oracle.name_input_label")}
        </label>
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("oracle.name_input_placeholder")}
            className="w-full bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent pe-10"
            data-testid="name-input"
          />
          <button
            type="button"
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="absolute top-2 end-2 w-7 h-7 flex items-center justify-center text-nps-text-dim hover:text-nps-oracle-accent transition-colors rounded"
            aria-label={t("oracle.keyboard_toggle")}
            title={t("oracle.keyboard_persian")}
            data-testid="keyboard-toggle"
          >
            ⌨
          </button>
        </div>
        {showKeyboard && (
          <Suspense
            fallback={
              <div className="h-32 animate-pulse bg-nps-bg-input rounded mt-1" />
            }
          >
            <PersianKeyboard
              onCharacterClick={handleKeyboardChar}
              onBackspace={handleKeyboardBackspace}
              onClose={() => setShowKeyboard(false)}
            />
          </Suspense>
        )}
      </div>

      {/* Use Profile Name button */}
      {userName && (
        <button
          type="button"
          onClick={handleUseProfileName}
          className="text-xs text-nps-oracle-accent hover:text-nps-oracle-accent/80 transition-colors"
          data-testid="use-profile-name"
        >
          {t("oracle.use_profile_name")}
        </button>
      )}

      {/* Numerology system selector */}
      <NumerologySystemSelector
        value={numerologySystem}
        onChange={setNumerologySystem}
        userName={name || userName || ""}
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full px-4 py-2 text-sm bg-nps-oracle-accent text-nps-bg font-medium rounded hover:bg-nps-oracle-accent/80 transition-colors disabled:opacity-50"
        data-testid="submit-name-reading"
      >
        {isSubmitting ? t("common.loading") : t("oracle.submit_name_reading")}
      </button>

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
    </form>
  );
}
