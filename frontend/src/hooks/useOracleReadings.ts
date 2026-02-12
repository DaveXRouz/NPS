import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { oracle } from "@/services/api";

const HISTORY_KEY = ["oracleReadings"] as const;

export function useSubmitReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datetime?: string) => oracle.reading(datetime),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  });
}

export function useSubmitQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      question: string;
      userId?: number;
      system?: string;
    }) => oracle.question(params.question, params.userId, params.system),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  });
}

export function useSubmitName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; userId?: number; system?: string }) =>
      oracle.name(params.name, params.userId, params.system),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  });
}

export function useSubmitTimeReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: import("@/types").TimeReadingRequest) =>
      oracle.timeReading(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
  });
}

export function useReadingHistory(params?: {
  limit?: number;
  offset?: number;
  sign_type?: string;
}) {
  return useQuery({
    queryKey: [...HISTORY_KEY, params],
    queryFn: () => oracle.history(params),
  });
}
