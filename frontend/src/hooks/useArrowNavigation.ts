import { useCallback } from "react";

interface ArrowNavOptions {
  orientation?: "horizontal" | "vertical";
  loop?: boolean;
}

export function useArrowNavigation(
  containerRef: React.RefObject<HTMLElement | null>,
  options: ArrowNavOptions = {},
) {
  const { orientation = "horizontal", loop = true } = options;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(
          '[role="tab"], [role="menuitem"], [role="option"]',
        ),
      );
      if (items.length === 0) return;

      const currentIndex = items.indexOf(e.target as HTMLElement);
      if (currentIndex === -1) return;

      // RTL-aware direction: swap left/right when RTL
      const isRTL = document.documentElement.dir === "rtl";
      const prevKey =
        orientation === "horizontal"
          ? isRTL
            ? "ArrowRight"
            : "ArrowLeft"
          : "ArrowUp";
      const nextKey =
        orientation === "horizontal"
          ? isRTL
            ? "ArrowLeft"
            : "ArrowRight"
          : "ArrowDown";

      let newIndex = currentIndex;

      if (e.key === nextKey) {
        e.preventDefault();
        newIndex = loop
          ? (currentIndex + 1) % items.length
          : Math.min(currentIndex + 1, items.length - 1);
      } else if (e.key === prevKey) {
        e.preventDefault();
        newIndex = loop
          ? (currentIndex - 1 + items.length) % items.length
          : Math.max(currentIndex - 1, 0);
      } else if (e.key === "Home") {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        newIndex = items.length - 1;
      }

      if (newIndex !== currentIndex) {
        items[newIndex].focus();
        items[newIndex].click();
      }
    },
    [containerRef, orientation, loop],
  );

  return { handleKeyDown };
}
