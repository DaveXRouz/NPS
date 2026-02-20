import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import { FadeIn } from "@/components/common/FadeIn";
import { SlideIn } from "@/components/common/SlideIn";
import {
  ReadingTypeSelector,
  type ReadingType,
} from "@/components/oracle/ReadingTypeSelector";
import { OracleConsultationForm } from "@/components/oracle/OracleConsultationForm";
import { CalculationAnimation } from "@/components/oracle/CalculationAnimation";
import { ReadingResults } from "@/components/oracle/ReadingResults";
import { MultiUserSelector } from "@/components/oracle/MultiUserSelector";
import { UserForm } from "@/components/oracle/UserForm";
import {
  useOracleUsers,
  useCreateOracleUser,
  useUpdateOracleUser,
  useDeleteOracleUser,
} from "@/hooks/useOracleUsers";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { usePageTitle } from "@/hooks/usePageTitle";
import type {
  OracleUserCreate,
  SelectedUsers,
  ConsultationResult,
} from "@/types";

const SELECTED_USER_KEY = "nps_selected_oracle_user";
const VALID_TYPES: ReadingType[] = [
  "time",
  "name",
  "question",
  "daily",
  "multi",
];

export default function Oracle() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  usePageTitle("oracle.title");
  const [searchParams, setSearchParams] = useSearchParams();
  const rawType = searchParams.get("type");
  const readingType: ReadingType = VALID_TYPES.includes(rawType as ReadingType)
    ? (rawType as ReadingType)
    : "time";

  // User data
  const { data: users = [], isLoading: usersLoading } = useOracleUsers();
  const createUser = useCreateOracleUser();
  const updateUser = useUpdateOracleUser();
  const deleteUser = useDeleteOracleUser();

  const [selectedUsers, setSelectedUsers] = useState<SelectedUsers | null>(
    null,
  );
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Reading state
  const [consultationResult, setConsultationResult] =
    useState<ConsultationResult | null>(null);
  const readingProgress = useReadingProgress();
  const [isLoading, setIsLoading] = useState(false);
  const [resultKey, setResultKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // AbortController for cancelling in-flight reading requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  // Restore persisted primary user on load, or clear if user was deleted
  useEffect(() => {
    if (users.length === 0) return;
    if (!selectedUsers) {
      // Restore from localStorage
      const stored = localStorage.getItem(SELECTED_USER_KEY);
      if (stored) {
        const user = users.find((u) => u.id === Number(stored));
        if (user) {
          setSelectedUsers({ primary: user, secondary: [] });
        }
      }
    } else if (
      selectedUsers.primary &&
      !users.find((u) => u.id === selectedUsers.primary.id)
    ) {
      // Clear selection if primary user no longer exists
      setSelectedUsers(null);
    }
  }, [users, selectedUsers]);

  // Persist selected primary user
  useEffect(() => {
    if (selectedUsers?.primary) {
      localStorage.setItem(SELECTED_USER_KEY, String(selectedUsers.primary.id));
    } else {
      localStorage.removeItem(SELECTED_USER_KEY);
    }
  }, [selectedUsers]);

  const primaryUser = selectedUsers?.primary ?? null;

  function handleCreate(data: OracleUserCreate) {
    setFormError(null);
    createUser.mutate(data, {
      onSuccess: (newUser) => {
        setSelectedUsers({ primary: newUser, secondary: [] });
        setFormMode(null);
        setFormError(null);
        addToast({
          type: "success",
          message: t("oracle.profile_created"),
          duration: 3000,
        });
      },
      onError: (err) => setFormError(err.message),
    });
  }

  function handleUpdate(data: OracleUserCreate) {
    if (!selectedUsers?.primary) return;
    setFormError(null);
    updateUser.mutate(
      { id: selectedUsers.primary.id, data },
      {
        onSuccess: () => {
          setFormMode(null);
          setFormError(null);
          addToast({
            type: "success",
            message: t("oracle.profile_updated"),
            duration: 3000,
          });
        },
        onError: (err) => setFormError(err.message),
      },
    );
  }

  function handleDelete() {
    if (!selectedUsers?.primary) return;
    deleteUser.mutate(selectedUsers.primary.id, {
      onSuccess: () => {
        setSelectedUsers(null);
        setFormMode(null);
      },
    });
  }

  function handleTypeChange(type: ReadingType) {
    setSearchParams({ type });
    setConsultationResult(null);
  }

  function handleResult(result: ConsultationResult) {
    setConsultationResult(result);
    setIsLoading(false);
    setResultKey((k) => k + 1);
    addToast({
      type: "success",
      message: t("oracle.reading_complete"),
      duration: 3000,
    });
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleLoadingChange(loading: boolean) {
    setIsLoading(loading);
  }

  return (
    <div
      className="flex flex-col md:flex-row gap-4 lg:gap-6"
      data-page="oracle"
    >
      {/* LEFT PANEL */}
      <aside className="w-full md:w-72 lg:w-80 md:flex-shrink-0 md:sticky md:top-6 md:self-start space-y-4">
        {/* User Profile Card */}
        <FadeIn delay={0}>
          <section className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
            <h3 className="text-sm font-semibold text-[var(--nps-accent)] mb-3">
              {t("oracle.user_profile")}
            </h3>
            {readingType === "multi" ? (
              <MultiUserSelector
                users={users}
                selectedUsers={selectedUsers}
                onChange={setSelectedUsers}
                onAddNew={() => setFormMode("create")}
                onEdit={() => setFormMode("edit")}
                isLoading={usersLoading}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                  <select
                    value={primaryUser?.id ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSelectedUsers(null);
                        return;
                      }
                      const user = users.find((u) => u.id === Number(val));
                      if (user)
                        setSelectedUsers({
                          primary: user,
                          secondary: [],
                        });
                    }}
                    className="bg-[var(--nps-bg-input)] border border-[var(--nps-glass-border)] text-[var(--nps-text)] rounded-lg px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[160px] min-h-[44px] sm:min-h-0 focus:outline-none focus:border-[var(--nps-accent)] transition-all duration-300"
                    aria-label={t("oracle.select_profile")}
                  >
                    <option value="">
                      {users.length === 0
                        ? t("oracle.no_profiles")
                        : t("oracle.select_profile")}
                    </option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setFormMode("create")}
                    className="px-3 py-2 text-xs bg-[var(--nps-accent)]/20 text-[var(--nps-accent)] border border-[var(--nps-border)] rounded hover:bg-[var(--nps-accent)]/30 transition-colors min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                  >
                    + {t("oracle.add_new_profile")}
                  </button>
                  {primaryUser && (
                    <button
                      type="button"
                      onClick={() => setFormMode("edit")}
                      className="px-3 py-2 text-xs text-[var(--nps-text-dim)] border border-[var(--nps-border)] rounded hover:text-[var(--nps-text)] transition-colors min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                    >
                      {t("oracle.edit_profile")}
                    </button>
                  )}
                </div>
                {primaryUser && (
                  <div className="text-xs text-[var(--nps-text-dim)]">
                    {t("oracle.field_birthday")}: {primaryUser.birthday}
                    {primaryUser.country && ` · ${primaryUser.country}`}
                    {primaryUser.city && `, ${primaryUser.city}`}
                  </div>
                )}
              </div>
            )}
          </section>
        </FadeIn>

        {/* Reading Type Card */}
        <FadeIn delay={100}>
          <section className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
            <h3 className="text-sm font-semibold text-[var(--nps-accent)] mb-3">
              {t("oracle.reading_type")}
            </h3>
            <ReadingTypeSelector
              value={readingType}
              onChange={handleTypeChange}
              disabled={isLoading}
            />
          </section>
        </FadeIn>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 space-y-6">
        {/* Form / Loading Card */}
        <FadeIn delay={200}>
          <section
            id="oracle-form-panel"
            role="tabpanel"
            className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-lg p-4 lg:p-6 min-h-[200px] md:min-h-[300px] hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300"
          >
            <h3 className="text-sm font-semibold text-[var(--nps-accent)] mb-4">
              {t(`oracle.type_${readingType}_title`)}
            </h3>
            {isLoading ? (
              <CalculationAnimation
                readingType={readingType}
                step={readingProgress.step}
                progress={readingProgress.progress}
                message={
                  readingProgress.message || t("oracle.loading_generating")
                }
                onCancel={handleCancel}
              />
            ) : primaryUser || readingType === "daily" ? (
              <OracleConsultationForm
                readingType={readingType}
                userId={primaryUser?.id ?? 0}
                userName={primaryUser?.name ?? ""}
                selectedUsers={selectedUsers}
                onResult={handleResult}
                onLoadingChange={handleLoadingChange}
                abortControllerRef={abortControllerRef}
              />
            ) : (
              <p className="text-[var(--nps-text-dim)] text-sm">
                {t("oracle.select_to_begin")}
              </p>
            )}
          </section>
        </FadeIn>

        {/* Results Card */}
        <SlideIn key={resultKey} from="bottom">
          <section
            ref={resultsRef}
            className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-lg p-4 lg:p-6 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300"
          >
            <h3 className="text-sm font-semibold text-[var(--nps-accent)] mb-3">
              {t("oracle.reading_results")}
            </h3>
            <ReadingResults result={consultationResult} />
          </section>
        </SlideIn>
      </main>

      {/* UserForm Modal */}
      {formMode === "create" && (
        <UserForm
          onSubmit={handleCreate}
          onCancel={() => {
            setFormMode(null);
            setFormError(null);
          }}
          isSubmitting={createUser.isPending}
          serverError={formError}
        />
      )}
      {formMode === "edit" && primaryUser && (
        <UserForm
          user={primaryUser}
          onSubmit={handleUpdate}
          onCancel={() => {
            setFormMode(null);
            setFormError(null);
          }}
          onDelete={handleDelete}
          isSubmitting={updateUser.isPending}
          serverError={formError}
        />
      )}
    </div>
  );
}
