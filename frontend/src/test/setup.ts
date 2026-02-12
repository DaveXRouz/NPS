import "@testing-library/jest-dom";
import { expect } from "vitest";

// Mock window.matchMedia for jsdom (used by useBreakpoint hook)
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Extend expect with axe-core toHaveNoViolations
import axeCore from "axe-core";

interface AxeViolation {
  impact: string;
  description: string;
  nodes: Array<{ html: string }>;
}

function toHaveNoViolations(results: { violations: AxeViolation[] }) {
  const violations = results.violations.filter(
    (v: AxeViolation) => v.impact === "critical" || v.impact === "serious",
  );
  return {
    pass: violations.length === 0,
    message: () =>
      violations
        .map(
          (v: AxeViolation) =>
            `${v.impact}: ${v.description}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`,
        )
        .join("\n\n"),
  };
}

expect.extend({ toHaveNoViolations });

// Helper: run axe-core on a container
export async function checkA11y(container: HTMLElement) {
  const results = await axeCore.run(container);
  expect(results).toHaveNoViolations();
}

declare module "vitest" {
  interface Assertion {
    toHaveNoViolations(): void;
  }
}
