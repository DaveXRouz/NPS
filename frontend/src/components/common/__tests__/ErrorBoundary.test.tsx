import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../ErrorBoundary";

vi.mock("react-i18next", () => ({
  withTranslation:
    () => (Component: React.ComponentType<Record<string, unknown>>) => {
      const Wrapped = (props: Record<string, unknown>) => {
        const t = (key: string) => {
          const map: Record<string, string> = {
            "common.error_boundary_title": "Something went wrong",
            "common.error_boundary_message": "An unexpected error occurred",
            "common.retry": "Try Again",
            "common.go_home": "Go to Dashboard",
            "common.error_details": "Error details",
          };
          return map[key] ?? key;
        };
        return (
          <Component
            {...props}
            t={t}
            i18n={{ language: "en", changeLanguage: () => {} }}
          />
        );
      };
      Wrapped.displayName = `withTranslation(${Component.displayName ?? Component.name ?? "Component"})`;
      return Wrapped;
    },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// Suppress React error boundary console.error noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("ErrorBoundary") || msg.includes("The above error"))
      return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <div>All good</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("shows fallback when child throws during render", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("Try Again button resets and re-renders children", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) throw new Error("Oops");
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the error condition before clicking retry
    shouldThrow = false;
    await user.click(screen.getByText("Try Again"));

    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });

  it("custom fallback prop is used when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("has Go to Dashboard link", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    const link = screen.getByText("Go to Dashboard");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
