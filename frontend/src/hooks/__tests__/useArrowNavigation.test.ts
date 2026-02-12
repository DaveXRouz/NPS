import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useArrowNavigation } from "../useArrowNavigation";
import type React from "react";

function createTabList() {
  const container = document.createElement("div");
  container.setAttribute("role", "tablist");
  const tab1 = document.createElement("button");
  tab1.setAttribute("role", "tab");
  tab1.textContent = "Tab 1";
  const tab2 = document.createElement("button");
  tab2.setAttribute("role", "tab");
  tab2.textContent = "Tab 2";
  const tab3 = document.createElement("button");
  tab3.setAttribute("role", "tab");
  tab3.textContent = "Tab 3";
  container.appendChild(tab1);
  container.appendChild(tab2);
  container.appendChild(tab3);
  document.body.appendChild(container);
  return { container, tab1, tab2, tab3 };
}

function createKeyEvent(key: string): React.KeyboardEvent {
  return {
    key,
    preventDefault: () => {},
    target: document.activeElement,
  } as unknown as React.KeyboardEvent;
}

afterEach(() => {
  document.documentElement.dir = "";
});

describe("useArrowNavigation", () => {
  it("ArrowRight moves focus to next item", () => {
    const { container, tab1, tab2 } = createTabList();
    const ref = { current: container };

    const { result } = renderHook(() => useArrowNavigation(ref));

    tab1.focus();
    act(() => {
      result.current.handleKeyDown({
        ...createKeyEvent("ArrowRight"),
        target: tab1,
      } as unknown as React.KeyboardEvent);
    });

    expect(document.activeElement).toBe(tab2);
    document.body.removeChild(container);
  });

  it("ArrowLeft moves focus to previous item", () => {
    const { container, tab1, tab2 } = createTabList();
    const ref = { current: container };

    const { result } = renderHook(() => useArrowNavigation(ref));

    tab2.focus();
    act(() => {
      result.current.handleKeyDown({
        ...createKeyEvent("ArrowLeft"),
        target: tab2,
      } as unknown as React.KeyboardEvent);
    });

    expect(document.activeElement).toBe(tab1);
    document.body.removeChild(container);
  });

  it("loops from last to first", () => {
    const { container, tab1, tab3 } = createTabList();
    const ref = { current: container };

    const { result } = renderHook(() => useArrowNavigation(ref));

    tab3.focus();
    act(() => {
      result.current.handleKeyDown({
        ...createKeyEvent("ArrowRight"),
        target: tab3,
      } as unknown as React.KeyboardEvent);
    });

    expect(document.activeElement).toBe(tab1);
    document.body.removeChild(container);
  });

  it("Home focuses first item", () => {
    const { container, tab1, tab3 } = createTabList();
    const ref = { current: container };

    const { result } = renderHook(() => useArrowNavigation(ref));

    tab3.focus();
    act(() => {
      result.current.handleKeyDown({
        ...createKeyEvent("Home"),
        target: tab3,
      } as unknown as React.KeyboardEvent);
    });

    expect(document.activeElement).toBe(tab1);
    document.body.removeChild(container);
  });

  it("End focuses last item", () => {
    const { container, tab1, tab3 } = createTabList();
    const ref = { current: container };

    const { result } = renderHook(() => useArrowNavigation(ref));

    tab1.focus();
    act(() => {
      result.current.handleKeyDown({
        ...createKeyEvent("End"),
        target: tab1,
      } as unknown as React.KeyboardEvent);
    });

    expect(document.activeElement).toBe(tab3);
    document.body.removeChild(container);
  });

  it("reverses direction in RTL", () => {
    document.documentElement.dir = "rtl";

    const { container, tab1, tab2 } = createTabList();
    const ref = { current: container };

    const { result } = renderHook(() => useArrowNavigation(ref));

    // In RTL, ArrowRight should go to previous (tab1 is "previous" from tab2's perspective)
    tab2.focus();
    act(() => {
      result.current.handleKeyDown({
        ...createKeyEvent("ArrowRight"),
        target: tab2,
      } as unknown as React.KeyboardEvent);
    });

    expect(document.activeElement).toBe(tab1);
    document.body.removeChild(container);
  });
});
