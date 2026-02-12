import { Suspense, type ReactNode } from "react";
import { PageLoadingFallback } from "./PageLoadingFallback";

interface LazyPageProps {
  children: ReactNode;
}

/**
 * Suspense wrapper with loading skeleton for lazy-loaded pages.
 */
export function LazyPage({ children }: LazyPageProps) {
  return <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>;
}
