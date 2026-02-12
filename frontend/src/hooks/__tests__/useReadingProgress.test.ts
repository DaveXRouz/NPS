import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the wsClient to control event dispatch
const mockHandlers = new Map<
  string,
  Set<(data: Record<string, unknown>) => void>
>();

vi.mock("@/services/websocket", () => ({
  wsClient: {
    on: (event: string, handler: (data: Record<string, unknown>) => void) => {
      if (!mockHandlers.has(event)) {
        mockHandlers.set(event, new Set());
      }
      mockHandlers.get(event)!.add(handler);
      return () => mockHandlers.get(event)?.delete(handler);
    },
    off: (event: string, handler: (data: Record<string, unknown>) => void) => {
      mockHandlers.get(event)?.delete(handler);
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    onStatus: vi.fn(() => vi.fn()),
  },
}));

import { useReadingProgress } from "../useReadingProgress";

function emitEvent(event: string, data: Record<string, unknown>) {
  const handlers = mockHandlers.get(event);
  handlers?.forEach((h) => h(data));
}

describe("useReadingProgress", () => {
  beforeEach(() => {
    mockHandlers.clear();
  });

  it("returns correct initial state", () => {
    const { result } = renderHook(() => useReadingProgress());
    expect(result.current.isActive).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.lastReading).toBeNull();
  });

  it("activates on reading_started event", () => {
    const { result } = renderHook(() => useReadingProgress());

    act(() => {
      emitEvent("reading_started", {
        step: "started",
        progress: 0,
        message: "Starting...",
      });
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.step).toBe("started");
    expect(result.current.progress).toBe(0);
  });

  it("updates progress on reading_progress event", () => {
    const { result } = renderHook(() => useReadingProgress());

    act(() => {
      emitEvent("reading_started", {
        step: "started",
        progress: 0,
        message: "Starting",
      });
    });

    act(() => {
      emitEvent("reading_progress", {
        step: "calculating",
        progress: 50,
        message: "Computing numerology",
      });
    });

    expect(result.current.step).toBe("calculating");
    expect(result.current.progress).toBe(50);
    expect(result.current.message).toBe("Computing numerology");
  });

  it("completes on reading_complete event", () => {
    const { result } = renderHook(() => useReadingProgress());

    act(() => {
      emitEvent("reading_started", {
        step: "started",
        progress: 0,
        message: "Starting",
      });
    });

    act(() => {
      emitEvent("reading_complete", {
        reading_id: 42,
        sign_type: "time",
        summary: "Your reading is ready",
      });
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.progress).toBe(100);
    expect(result.current.step).toBe("complete");
    expect(result.current.lastReading).not.toBeNull();
    expect(result.current.lastReading?.reading_id).toBe(42);
  });

  it("sets error on reading_error event", () => {
    const { result } = renderHook(() => useReadingProgress());

    act(() => {
      emitEvent("reading_started", {
        step: "started",
        progress: 0,
        message: "Starting",
      });
    });

    act(() => {
      emitEvent("reading_error", {
        error: "AI service unavailable",
        sign_type: "time",
      });
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.step).toBe("error");
    expect(result.current.error).toBe("AI service unavailable");
  });
});
