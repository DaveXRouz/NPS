import { useState, useEffect, type ReactNode, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { XCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import {
  ToastContext,
  useToast,
  useToastState,
  type Toast as ToastItem,
  type ToastContextValue,
} from "@/hooks/useToast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const state = useToastState();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return state.subscribe(() => {
      setToasts([...state.getToasts()]);
    });
  }, [state]);

  const ctxValue: ToastContextValue = {
    toasts,
    addToast: state.addToast,
    dismissToast: state.dismissToast,
  };

  return (
    <ToastContext.Provider value={ctxValue}>{children}</ToastContext.Provider>
  );
}

const ICON_MAP: Record<
  ToastItem["type"],
  ComponentType<{ size?: number | string; className?: string }>
> = {
  error: XCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLOR_MAP: Record<ToastItem["type"], string> = {
  error: "text-nps-error",
  success: "text-nps-success",
  warning: "text-nps-warning",
  info: "text-nps-accent",
};

const BORDER_MAP: Record<ToastItem["type"], string> = {
  error: "border-nps-error",
  success: "border-nps-success",
  warning: "border-nps-warning",
  info: "border-nps-accent",
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const isRtl =
    typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const Icon = ICON_MAP[toast.type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 px-3 py-2 rounded-lg border bg-[var(--nps-bg-card)] shadow-lg text-sm text-nps-text ${BORDER_MAP[toast.type]} ${
        isRtl ? "animate-slide-in-left" : "animate-slide-in-right"
      }`}
    >
      <span className={`flex-shrink-0 mt-0.5 ${ICON_COLOR_MAP[toast.type]}`}>
        <Icon size={18} />
      </span>
      <span className="flex-1 break-words">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-nps-text-dim hover:text-nps-text transition-colors"
        aria-label={t("common.dismiss")}
      >
        &times;
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 z-[60] flex flex-col gap-2 w-80 ltr:right-4 rtl:left-4"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
