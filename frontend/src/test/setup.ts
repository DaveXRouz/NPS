import "@testing-library/jest-dom";
import { expect, vi } from "vitest";

// Global i18n mock — per-file vi.mock("react-i18next") overrides this automatically
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{{${k}}}`, String(v)),
          key,
        );
      }
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  withTranslation: () => (Component: unknown) => Component,
  Trans: ({ children }: { children: React.ReactNode }) => children,
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

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
