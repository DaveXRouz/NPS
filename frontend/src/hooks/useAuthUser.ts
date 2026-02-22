import { useQuery } from "@tanstack/react-query";
import { adminHealth } from "@/services/api";

interface AuthUser {
  isAdmin: boolean;
  isLoading: boolean;
}

const AUTH_KEY = ["auth", "role"] as const;

/**
 * Verify the current user's admin status via a server-side check.
 *
 * Calls an admin-scoped endpoint (/health/detailed). If it returns 200,
 * the user's API key has admin scope. If 401/403, they don't.
 *
 * The result is cached by React Query (staleTime: 5 min) so we don't
 * hit the server on every render. localStorage is only used as a stale
 * cache hint for faster initial renders — never trusted for authorization.
 */
export function useAuthUser(): AuthUser {
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: [...AUTH_KEY],
    queryFn: async () => {
      try {
        await adminHealth.detailed();
        return true;
      } catch {
        return false;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading,
  };
}
