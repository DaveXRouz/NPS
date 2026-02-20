import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type RefCallback,
} from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseInViewReturn {
  ref: RefCallback<Element>;
  inView: boolean;
}

/**
 * Observes when an element enters the viewport via IntersectionObserver.
 * Returns { ref, inView }. Degrades gracefully:
 * - No IntersectionObserver support → always true
 * - prefers-reduced-motion → always true (skip scroll-triggered animations)
 */
export function useInView({
  threshold = 0,
  rootMargin = "0px",
  triggerOnce = false,
}: UseInViewOptions = {}): UseInViewReturn {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<Element | null>(null);
  const frozenRef = useRef(false);

  // Degrade gracefully: no IO support or reduced motion → always visible
  const noSupport =
    typeof window === "undefined" ||
    typeof IntersectionObserver === "undefined";
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const shouldBypass = noSupport || reducedMotion;

  useEffect(() => {
    if (shouldBypass) {
      setInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (frozenRef.current) return;
        const isInView = entry.isIntersecting;
        setInView(isInView);
        if (isInView && triggerOnce) {
          frozenRef.current = true;
          observerRef.current?.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, shouldBypass]);

  const ref = useCallback((node: Element | null) => {
    if (elementRef.current) {
      observerRef.current?.unobserve(elementRef.current);
    }
    elementRef.current = node;
    if (node && observerRef.current && !frozenRef.current) {
      observerRef.current.observe(node);
    }
  }, []);

  return { ref, inView: shouldBypass ? true : inView };
}
