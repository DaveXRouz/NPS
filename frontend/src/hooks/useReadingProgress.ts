import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import type { EventType } from "@/types";

interface ReadingProgress {
  step: number;
  total: number;
  message: string;
  readingType: string;
  isActive: boolean;
}

const INITIAL_PROGRESS: ReadingProgress = {
  step: 0,
  total: 0,
  message: "",
  readingType: "",
  isActive: false,
};

export function useReadingProgress(): {
  progress: ReadingProgress;
  startProgress: (readingType: string) => void;
  resetProgress: () => void;
} {
  const [progress, setProgress] = useState<ReadingProgress>(INITIAL_PROGRESS);
  const activeRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useWebSocket("reading_progress" as EventType, (data) => {
    if (!activeRef.current) return;
    setProgress((prev) => ({
      ...prev,
      step: (data.step as number) ?? prev.step,
      total: (data.total as number) ?? prev.total,
      message: (data.message as string) ?? prev.message,
    }));
  });

  // Auto-deactivate when step reaches total
  useEffect(() => {
    if (
      progress.isActive &&
      progress.step === progress.total &&
      progress.total > 0
    ) {
      timeoutRef.current = setTimeout(() => {
        setProgress(INITIAL_PROGRESS);
        activeRef.current = false;
      }, 500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [progress.step, progress.total, progress.isActive]);

  const startProgress = useCallback((readingType: string) => {
    activeRef.current = true;
    setProgress({
      step: 0,
      total: 0,
      message: "",
      readingType,
      isActive: true,
    });
  }, []);

  const resetProgress = useCallback(() => {
    activeRef.current = false;
    setProgress(INITIAL_PROGRESS);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { progress, startProgress, resetProgress };
}
