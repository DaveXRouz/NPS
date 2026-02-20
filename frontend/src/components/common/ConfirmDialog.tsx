import { useRef, useEffect } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useTranslation } from "react-i18next";

type ConfirmVariant = "danger" | "warning" | "default";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: ConfirmVariant;
}

const variantStyles: Record<
  ConfirmVariant,
  { border: string; confirmBtn: string }
> = {
  danger: {
    border: "border-[var(--nps-error)]/30",
    confirmBtn:
      "bg-[var(--nps-bg-danger)] hover:bg-[var(--nps-bg-danger)]/80 text-white",
  },
  warning: {
    border: "border-amber-500/30",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  default: {
    border: "border-[var(--nps-glass-border-std)]",
    confirmBtn:
      "bg-[var(--nps-accent)] hover:bg-[var(--nps-accent-hover)] text-white",
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className={`
          bg-[var(--nps-glass-bg-lg)] backdrop-blur-[var(--nps-glass-blur-md)]
          border ${styles.border} rounded-xl
          p-6 w-full max-w-sm
          shadow-lg nps-animate-scale-in
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[var(--nps-text-bright)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[var(--nps-text-dim)] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-[var(--nps-text)] bg-[var(--nps-bg-input)] hover:bg-[var(--nps-bg-hover)] transition-colors"
          >
            {cancelLabel ?? t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${styles.confirmBtn}`}
          >
            {confirmLabel ?? t("common.confirm", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
