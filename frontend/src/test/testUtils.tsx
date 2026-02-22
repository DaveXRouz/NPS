import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { ToastContext, type ToastContextValue } from "@/hooks/useToast";
import type { ReactElement } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const noopToastCtx: ToastContextValue = {
  toasts: [],
  addToast: () => {},
  dismissToast: () => {},
};

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions,
) {
  const queryClient = createTestQueryClient();
  const { initialEntries, ...renderOptions } = options ?? {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastContext.Provider value={noopToastCtx}>
          {initialEntries ? (
            <MemoryRouter initialEntries={initialEntries}>
              {children}
            </MemoryRouter>
          ) : (
            <BrowserRouter>{children}</BrowserRouter>
          )}
        </ToastContext.Provider>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}

export { render };
