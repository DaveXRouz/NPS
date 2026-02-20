import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls the main content area to top on route change.
 * Uses `behavior: "instant"` to avoid janky scroll animation.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main?.scrollTo) {
      main.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}
