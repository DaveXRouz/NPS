import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PERSIAN_ROWS,
  PERSIAN_SHIFT_ROWS,
} from "@/utils/persianKeyboardLayout";

interface PersianKeyboardProps {
  onCharacterClick: (char: string) => void;
  onBackspace: () => void;
  onClose: () => void;
}

export function PersianKeyboard({
  onCharacterClick,
  onBackspace,
  onClose,
}: PersianKeyboardProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isShifted, setIsShifted] = useState(false);
  const [positionAbove, setPositionAbove] = useState(false);

  const rows = isShifted ? PERSIAN_SHIFT_ROWS : PERSIAN_ROWS;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        setPositionAbove(true);
      }
    }
  }, []);

  return (
    <>
      {/* Transparent backdrop for outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-label={t("oracle.keyboard_persian")}
        dir="rtl"
        className={`absolute left-0 right-0 z-50 bg-nps-bg-card border border-nps-oracle-border rounded-lg p-3 shadow-lg ${
          positionAbove ? "bottom-full mb-1" : "top-full mt-1"
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-1 start-1 w-6 h-6 flex items-center justify-center text-nps-text-dim hover:text-nps-text text-xs rounded"
          aria-label={t("oracle.keyboard_close")}
        >
          ✕
        </button>

        {/* Character rows */}
        <div className="space-y-1.5 mt-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 justify-center flex-wrap">
              {row.map((char) => (
                <button
                  key={`${isShifted ? "s" : "b"}-${char}`}
                  type="button"
                  onClick={() => onCharacterClick(char)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onCharacterClick(char);
                  }}
                  aria-label={char}
                  className="w-8 h-8 text-sm bg-nps-bg-input hover:bg-nps-bg-hover active:bg-nps-oracle-accent/20 border border-nps-border rounded text-nps-text transition-colors select-none"
                >
                  {char}
                </button>
              ))}
            </div>
          ))}

          {/* Bottom row: Shift + Space + Backspace */}
          <div className="flex gap-1 justify-center">
            <button
              type="button"
              onClick={() => setIsShifted(!isShifted)}
              aria-label={t("oracle.keyboard_shift")}
              className={`h-8 px-3 text-xs border border-nps-border rounded transition-colors select-none ${
                isShifted
                  ? "bg-nps-oracle-accent/30 text-nps-oracle-accent border-nps-oracle-accent"
                  : "bg-nps-bg-input text-nps-text-dim hover:bg-nps-bg-hover"
              }`}
            >
              {t("oracle.keyboard_shift")}
            </button>
            <button
              type="button"
              onClick={() => onCharacterClick(" ")}
              onTouchStart={(e) => {
                e.preventDefault();
                onCharacterClick(" ");
              }}
              aria-label={t("oracle.keyboard_space")}
              className="h-8 px-8 text-xs bg-nps-bg-input hover:bg-nps-bg-hover border border-nps-border rounded text-nps-text-dim transition-colors select-none"
            >
              {t("oracle.keyboard_space")}
            </button>
            <button
              type="button"
              onClick={onBackspace}
              onTouchStart={(e) => {
                e.preventDefault();
                onBackspace();
              }}
              aria-label={t("oracle.keyboard_backspace")}
              className="h-8 px-4 text-xs bg-nps-bg-input hover:bg-nps-bg-hover border border-nps-border rounded text-nps-text-dim transition-colors select-none"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
