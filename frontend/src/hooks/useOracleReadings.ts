import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { oracle } from "@/services/api";
import type { ReadingSearchParams } from "@/types";

/** Shared retry config for queries: 3 retries with exponential backoff, skip client errors */
const queryRetryConfig = {
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

const HISTORY_KEY = ["oracleReadings"] as const;
const STATS_KEY = ["readingStats"] as const;

export function useSubmitReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datetime?: string) => oracle.reading(datetime),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
    retry: 0,
  });
}

export function useSubmitQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      question: string;
      userId?: number;
      system?: string;
      signal?: AbortSignal;
      category?: string;
      questionTime?: string;
      inquiryContext?: Record<string, string>;
    }) =>
      oracle.question(
        params.question,
        params.userId,
        params.system,
        params.signal,
        params.category,
        params.questionTime,
        params.inquiryContext,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
    retry: 0,
  });
}

export function useSubmitName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      motherName?: string;
      userId?: number;
      system?: string;
      signal?: AbortSignal;
      inquiryContext?: Record<string, string>;
    }) =>
      oracle.name(
        params.name,
        params.userId,
        params.system,
        params.motherName,
        params.signal,
        params.inquiryContext,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
    retry: 0,
  });
}

export function useSubmitTimeReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: import("@/types").TimeReadingRequest & { signal?: AbortSignal },
    ) => {
      const { signal, ...readingData } = data;
      return oracle.timeReading(readingData, signal);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
    retry: 0,
  });
}

export function useOracleDailyReading(userId: number | null, date?: string) {
  return useQuery({
    queryKey: ["dailyReading", userId, date],
    queryFn: () => oracle.getDailyReading(userId!, date),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min — daily readings don't change often
    ...queryRetryConfig,
  });
}

export function useGenerateDailyReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: import("@/types").DailyReadingRequest) =>
      oracle.dailyReading(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["dailyReading", variables.user_id],
      });
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
    },
    retry: 0,
  });
}

export function useSubmitMultiUserReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: import("@/types").MultiUserFrameworkRequest) =>
      oracle.multiUserFrameworkReading(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
    retry: 0,
  });
}

export function useReadingHistory(params?: ReadingSearchParams) {
  return useQuery({
    queryKey: [...HISTORY_KEY, params],
    queryFn: () => oracle.history(params),
    ...queryRetryConfig,
  });
}

export function useDeleteReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => oracle.deleteReading(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
    retry: false,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => oracle.toggleFavorite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HISTORY_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
    retry: false,
  });
}

export function useReadingStats() {
  return useQuery({
    queryKey: [...STATS_KEY],
    queryFn: () => oracle.readingStats(),
    staleTime: 60 * 1000, // 1 min
    ...queryRetryConfig,
  });
}
