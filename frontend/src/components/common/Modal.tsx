import { useRef, useEffect, type ReactNode } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  maxWidth = "max-w-lg",
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={`bg-[var(--nps-glass-bg-lg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border-std)] rounded-xl p-4 sm:p-6 w-full ${maxWidth} max-h-[90vh] overflow-y-auto shrink-0 nps-animate-scale-in shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-lg font-semibold text-[var(--nps-accent)] mb-3">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
