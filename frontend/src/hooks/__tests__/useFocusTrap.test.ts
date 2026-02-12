import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFocusTrap } from "../useFocusTrap";

function createContainer() {
  const container = document.createElement("div");
  const btn1 = document.createElement("button");
  btn1.textContent = "First";
  const btn2 = document.createElement("button");
  btn2.textContent = "Second";
  const btn3 = document.createElement("button");
  btn3.textContent = "Third";
  container.appendChild(btn1);
  container.appendChild(btn2);
  container.appendChild(btn3);
  document.body.appendChild(container);
  return { container, btn1, btn2, btn3 };
}

function fireKeyDown(target: HTMLElement, key: string, shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}

describe("useFocusTrap", () => {
  it("focuses first focusable element on mount", () => {
    const { container, btn1 } = createContainer();
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, true));

    expect(document.activeElement).toBe(btn1);
    document.body.removeChild(container);
  });

  it("wraps focus from last to first on Tab", () => {
    const { container, btn1, btn3 } = createContainer();
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, true));

    // Focus the last button
    btn3.focus();
    expect(document.activeElement).toBe(btn3);

    // Press Tab on last element
    fireKeyDown(container, "Tab");

    expect(document.activeElement).toBe(btn1);
    document.body.removeChild(container);
  });

  it("wraps focus from first to last on Shift+Tab", () => {
    const { container, btn1, btn3 } = createContainer();
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, true));

    // Focus the first button
    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    // Press Shift+Tab on first element
    fireKeyDown(container, "Tab", true);

    expect(document.activeElement).toBe(btn3);
    document.body.removeChild(container);
  });

  it("returns focus to previous element on unmount", () => {
    const outsideBtn = document.createElement("button");
    outsideBtn.textContent = "Outside";
    document.body.appendChild(outsideBtn);
    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);

    const { container, btn1 } = createContainer();
    const ref = { current: container };

    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    // Focus was moved to first button inside trap
    expect(document.activeElement).toBe(btn1);

    // Unmount should restore focus
    unmount();
    expect(document.activeElement).toBe(outsideBtn);

    document.body.removeChild(container);
    document.body.removeChild(outsideBtn);
  });

  it("does nothing when isActive is false", () => {
    const outsideBtn = document.createElement("button");
    outsideBtn.textContent = "Outside";
    document.body.appendChild(outsideBtn);
    outsideBtn.focus();

    const { container } = createContainer();
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, false));

    // Focus should NOT have moved
    expect(document.activeElement).toBe(outsideBtn);

    document.body.removeChild(container);
    document.body.removeChild(outsideBtn);
  });
});
