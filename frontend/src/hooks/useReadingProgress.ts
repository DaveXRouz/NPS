import { useState, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import type {
  ReadingProgressData,
  ReadingCompleteData,
  ReadingErrorData,
} from "@/types";

interface ReadingProgress {
  isActive: boolean;
  step: string;
  progress: number; // 0-100
  message: string;
  error: string | null;
  lastReading: ReadingCompleteData | null;
}

export function useReadingProgress(): ReadingProgress {
  const [state, setState] = useState<ReadingProgress>({
    isActive: false,
    step: "",
    progress: 0,
    message: "",
    error: null,
    lastReading: null,
  });

  useWebSocket(
    "reading_started",
    useCallback((data) => {
      setState({
        isActive: true,
        step: "started",
        progress: 0,
        message:
          (data as unknown as ReadingProgressData).message || "Starting...",
        error: null,
        lastReading: null,
      });
    }, []),
  );

  useWebSocket(
    "reading_progress",
    useCallback((data) => {
      const d = data as unknown as ReadingProgressData;
      setState((prev) => ({
        ...prev,
        step: d.step,
        progress: d.progress,
        message: d.message,
      }));
    }, []),
  );

  useWebSocket(
    "reading_complete",
    useCallback((data) => {
      const d = data as unknown as ReadingCompleteData;
      setState({
        isActive: false,
        step: "complete",
        progress: 100,
        message: "Reading complete",
        error: null,
        lastReading: d,
      });
    }, []),
  );

  useWebSocket(
    "reading_error",
    useCallback((data) => {
      const d = data as unknown as ReadingErrorData;
      setState((prev) => ({
        ...prev,
        isActive: false,
        step: "error",
        error: d.error,
      }));
    }, []),
  );

  return state;
}
