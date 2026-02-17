import { useState, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import type { OracleUser, OracleUserCreate, LocationData } from "@/types";
import { LocationSelector } from "./LocationSelector";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const PersianKeyboard = lazy(() =>
  import("./PersianKeyboard").then((m) => ({ default: m.PersianKeyboard })),
);
const CalendarPicker = lazy(() =>
  import("./CalendarPicker").then((m) => ({ default: m.CalendarPicker })),
);

interface UserFormProps {
  user?: OracleUser;
  onSubmit: (data: OracleUserCreate) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  serverError?: string | null;
}

interface FormErrors {
  name?: string;
  birthday?: string;
  mother_name?: string;
  heart_rate_bpm?: string;
}

function validate(
  data: OracleUserCreate,
  t: (key: string) => string,
): FormErrors {
  const errors: FormErrors = {};
  if (!data.name || data.name.trim().length < 2) {
    errors.name = t("oracle.error_name_required");
  } else if (/\d/.test(data.name)) {
    errors.name = t("oracle.error_name_no_digits");
  }
  if (!data.birthday) {
    errors.birthday = t("oracle.error_birthday_required");
  } else {
    const bd = new Date(data.birthday);
    if (bd > new Date()) {
      errors.birthday = t("oracle.error_birthday_future");
    } else if (bd.getFullYear() < 1900) {
      errors.birthday = t("oracle.error_birthday_too_old");
    }
  }
  if (!data.mother_name || data.mother_name.trim().length < 2) {
    errors.mother_name = t("oracle.error_mother_name_required");
  }
  if (data.heart_rate_bpm !== undefined && data.heart_rate_bpm !== null) {
    if (data.heart_rate_bpm < 30 || data.heart_rate_bpm > 220) {
      errors.heart_rate_bpm = t("oracle.error_heart_rate_range");
    }
  }
  return errors;
}

export function UserForm({
  user,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting,
  serverError,
}: UserFormProps) {
  const { t } = useTranslation();
  const isEdit = !!user;
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const [form, setForm] = useState<OracleUserCreate>({
    name: user?.name ?? "",
    name_persian: user?.name_persian ?? "",
    birthday: user?.birthday ?? "",
    mother_name: user?.mother_name ?? "",
    mother_name_persian: user?.mother_name_persian ?? "",
    country: user?.country ?? "",
    city: user?.city ?? "",
    gender: user?.gender ?? undefined,
    heart_rate_bpm: user?.heart_rate_bpm ?? undefined,
    timezone_hours: user?.timezone_hours ?? 0,
    timezone_minutes: user?.timezone_minutes ?? 0,
    latitude: user?.latitude ?? undefined,
    longitude: user?.longitude ?? undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeKeyboard, setActiveKeyboard] = useState<string | null>(null);

  function handleFieldChange(
    field: keyof OracleUserCreate,
    value: string | number | undefined,
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleKeyboardChar(char: string) {
    if (!activeKeyboard) return;
    setForm((prev) => ({
      ...prev,
      [activeKeyboard]:
        String(prev[activeKeyboard as keyof OracleUserCreate] ?? "") + char,
    }));
  }

  function handleKeyboardBackspace() {
    if (!activeKeyboard) return;
    setForm((prev) => {
      const current = String(
        prev[activeKeyboard as keyof OracleUserCreate] ?? "",
      );
      return { ...prev, [activeKeyboard]: current.slice(0, -1) };
    });
  }

  function handleLocationChange(loc: LocationData) {
    setForm((prev) => ({
      ...prev,
      country: loc.country ?? prev.country,
      city: loc.city ?? prev.city,
      latitude: loc.lat,
      longitude: loc.lon,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? t("oracle.edit_profile") : t("oracle.new_profile")}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-nps-bg-card border border-nps-oracle-border rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-nps-oracle-accent mb-3">
          {isEdit ? t("oracle.edit_profile") : t("oracle.new_profile")}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ─── Section 1: Identity ─── */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-nps-text-dim uppercase tracking-wide mb-1">
              {t("oracle.section_identity")}
            </legend>

            {/* Name */}
            <Field
              label={t("oracle.field_name")}
              value={form.name}
              onChange={(v) => handleFieldChange("name", v)}
              error={errors.name}
              required
            />

            {/* Persian Name + keyboard toggle */}
            <div className="relative">
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <Field
                    label={t("oracle.field_name_persian")}
                    value={form.name_persian ?? ""}
                    onChange={(v) => handleFieldChange("name_persian", v)}
                    dir="rtl"
                    lang="fa"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveKeyboard(
                      activeKeyboard === "name_persian" ? null : "name_persian",
                    )
                  }
                  className="mb-0.5 px-2 py-2 text-xs bg-nps-bg-input border border-nps-border rounded hover:bg-nps-bg-hover text-nps-text-dim"
                  aria-label={t("oracle.keyboard_toggle")}
                  data-testid="keyboard-toggle-name_persian"
                >
                  ⌨
                </button>
              </div>
              {activeKeyboard === "name_persian" && (
                <Suspense
                  fallback={
                    <div className="h-32 animate-pulse bg-nps-bg-input rounded mt-1" />
                  }
                >
                  <PersianKeyboard
                    onCharacterClick={handleKeyboardChar}
                    onBackspace={handleKeyboardBackspace}
                    onClose={() => setActiveKeyboard(null)}
                  />
                </Suspense>
              )}
            </div>

            {/* Birthday via CalendarPicker */}
            <Suspense
              fallback={
                <div className="h-10 animate-pulse bg-nps-bg-input rounded" />
              }
            >
              <CalendarPicker
                value={form.birthday}
                onChange={(isoDate) => handleFieldChange("birthday", isoDate)}
                label={t("oracle.field_birthday")}
                error={errors.birthday}
              />
            </Suspense>
          </fieldset>

          {/* ─── Section 2: Family ─── */}
          <fieldset className="space-y-2 pt-1">
            <legend className="text-xs font-medium text-nps-text-dim uppercase tracking-wide mb-1">
              {t("oracle.section_family")}
            </legend>

            {/* Mother's Name */}
            <Field
              label={t("oracle.field_mother_name")}
              value={form.mother_name}
              onChange={(v) => handleFieldChange("mother_name", v)}
              error={errors.mother_name}
              required
            />

            {/* Mother's Persian Name + keyboard toggle */}
            <div className="relative">
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <Field
                    label={t("oracle.field_mother_name_persian")}
                    value={form.mother_name_persian ?? ""}
                    onChange={(v) =>
                      handleFieldChange("mother_name_persian", v)
                    }
                    dir="rtl"
                    lang="fa"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveKeyboard(
                      activeKeyboard === "mother_name_persian"
                        ? null
                        : "mother_name_persian",
                    )
                  }
                  className="mb-0.5 px-2 py-2 text-xs bg-nps-bg-input border border-nps-border rounded hover:bg-nps-bg-hover text-nps-text-dim"
                  aria-label={t("oracle.keyboard_toggle")}
                  data-testid="keyboard-toggle-mother_name_persian"
                >
                  ⌨
                </button>
              </div>
              {activeKeyboard === "mother_name_persian" && (
                <Suspense
                  fallback={
                    <div className="h-32 animate-pulse bg-nps-bg-input rounded mt-1" />
                  }
                >
                  <PersianKeyboard
                    onCharacterClick={handleKeyboardChar}
                    onBackspace={handleKeyboardBackspace}
                    onClose={() => setActiveKeyboard(null)}
                  />
                </Suspense>
              )}
            </div>
          </fieldset>

          {/* ─── Section 3: Location ─── */}
          <fieldset className="space-y-2 pt-1">
            <legend className="text-xs font-medium text-nps-text-dim uppercase tracking-wide mb-1">
              {t("oracle.section_location")}
            </legend>

            <LocationSelector
              value={
                form.latitude !== undefined && form.longitude !== undefined
                  ? {
                      lat: form.latitude,
                      lon: form.longitude,
                      country: form.country,
                      city: form.city,
                    }
                  : null
              }
              onChange={handleLocationChange}
            />
          </fieldset>

          {/* ─── Section 4: Profile Details ─── */}
          <fieldset className="space-y-2 pt-1">
            <legend className="text-xs font-medium text-nps-text-dim uppercase tracking-wide mb-1">
              {t("oracle.section_details")}
            </legend>

            {/* Gender + Heart Rate — side by side on desktop */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Gender */}
              <div className="flex-1">
                <label
                  htmlFor="gender-select"
                  className="block text-sm text-nps-text-dim mb-1"
                >
                  {t("oracle.field_gender")}
                </label>
                <select
                  id="gender-select"
                  value={form.gender ?? ""}
                  onChange={(e) =>
                    handleFieldChange("gender", e.target.value || undefined)
                  }
                  className="w-full bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
                  data-testid="gender-select"
                >
                  <option value="">{t("oracle.gender_unset")}</option>
                  <option value="male">{t("oracle.gender_male")}</option>
                  <option value="female">{t("oracle.gender_female")}</option>
                </select>
              </div>

              {/* Heart Rate BPM */}
              <div className="flex-1">
                <label
                  htmlFor="heart-rate-input"
                  className="block text-sm text-nps-text-dim mb-1"
                >
                  {t("oracle.field_heart_rate")}
                </label>
                <input
                  id="heart-rate-input"
                  type="number"
                  min={30}
                  max={220}
                  value={form.heart_rate_bpm ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "heart_rate_bpm",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  aria-invalid={!!errors.heart_rate_bpm}
                  className={`w-full bg-nps-bg-input border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent ${
                    errors.heart_rate_bpm
                      ? "border-nps-error"
                      : "border-nps-border"
                  }`}
                  data-testid="heart-rate-input"
                />
                {errors.heart_rate_bpm && (
                  <p className="text-nps-error text-xs mt-1" role="alert">
                    {errors.heart_rate_bpm}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    let avg = 72;
                    if (form.birthday) {
                      const age = Math.floor(
                        (Date.now() - new Date(form.birthday).getTime()) /
                          31557600000,
                      );
                      if (age >= 18 && age <= 25) avg = 73;
                      else if (age <= 35) avg = 74;
                      else if (age <= 45) avg = 75;
                      else if (age <= 55) avg = 76;
                      else if (age <= 65) avg = 75;
                      else if (age > 65) avg = 73;
                    }
                    handleFieldChange("heart_rate_bpm", avg);
                  }}
                  className="mt-1 text-xs text-nps-oracle-accent hover:underline"
                >
                  {t("oracle.heart_rate_avg_label")}
                </button>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm text-nps-text-dim mb-1">
                {t("oracle.field_timezone")}
              </label>
              <div className="flex gap-2">
                <select
                  value={form.timezone_hours ?? 0}
                  onChange={(e) =>
                    handleFieldChange("timezone_hours", Number(e.target.value))
                  }
                  className="flex-1 bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
                  aria-label={t("oracle.timezone_hours")}
                  data-testid="timezone-hours"
                >
                  {Array.from({ length: 27 }, (_, i) => i - 12).map((h) => (
                    <option key={h} value={h}>
                      UTC{h >= 0 ? `+${h}` : h}
                    </option>
                  ))}
                </select>
                <select
                  value={form.timezone_minutes ?? 0}
                  onChange={(e) =>
                    handleFieldChange(
                      "timezone_minutes",
                      Number(e.target.value),
                    )
                  }
                  className="w-24 bg-nps-bg-input border border-nps-border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent"
                  aria-label={t("oracle.timezone_minutes")}
                  data-testid="timezone-minutes"
                >
                  <option value={0}>:00</option>
                  <option value={15}>:15</option>
                  <option value={30}>:30</option>
                  <option value={45}>:45</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Server error */}
          {serverError && (
            <p
              className="text-nps-error text-sm bg-nps-error/10 border border-nps-error/30 rounded px-3 py-2"
              role="alert"
            >
              {serverError}
            </p>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-nps-oracle-accent text-nps-bg font-medium rounded hover:bg-nps-oracle-accent/80 transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? t("common.loading")
                : isEdit
                  ? t("common.save")
                  : t("oracle.add_new_profile")}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-nps-text-dim border border-nps-border rounded hover:text-nps-text transition-colors"
            >
              {t("common.cancel")}
            </button>

            {isEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete) {
                    onDelete();
                  } else {
                    setConfirmDelete(true);
                  }
                }}
                className={`ms-auto px-4 py-2 text-sm rounded transition-colors ${
                  confirmDelete
                    ? "bg-nps-bg-danger text-white"
                    : "text-nps-error border border-nps-error/30 hover:border-nps-error"
                }`}
              >
                {confirmDelete
                  ? t("oracle.delete_confirm")
                  : t("oracle.delete_profile")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  dir,
  lang,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  dir?: string;
  lang?: string;
  required?: boolean;
}) {
  const fieldId = label.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const errorId = `${fieldId}-error`;

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm text-nps-text-dim mb-1">
        {label}
        {required && <span className="text-nps-error ms-1">*</span>}
      </label>
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        lang={lang}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full bg-nps-bg-input border rounded px-3 py-2 text-sm text-nps-text focus:outline-none focus:border-nps-oracle-accent ${
          error ? "border-nps-error" : "border-nps-border"
        }`}
      />
      {error && (
        <p id={errorId} className="text-nps-error text-xs mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
