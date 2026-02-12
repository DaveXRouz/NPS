import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { oracleUsers as api } from "@/services/api";
import type { OracleUserCreate, OracleUserUpdate } from "@/types";

const retryConfig = {
  retry: (failureCount: number, error: Error) => {
    if (
      "isClientError" in error &&
      (error as { isClientError: boolean }).isClientError
    )
      return false;
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 10000),
};

const QUERY_KEY = ["oracleUsers"] as const;

export function useOracleUsers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.list(),
    ...retryConfig,
  });
}

export function useOracleUser(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => api.get(id!),
    enabled: id !== null,
    ...retryConfig,
  });
}

export function useCreateOracleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OracleUserCreate) => api.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateOracleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: OracleUserUpdate }) =>
      api.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteOracleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
