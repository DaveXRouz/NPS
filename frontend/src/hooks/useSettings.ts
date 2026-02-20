import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settings, authKeys } from "@/services/api";

const SETTINGS_KEY = ["userSettings"] as const;
const API_KEYS_KEY = ["apiKeys"] as const;

function hasAuth(): boolean {
  return !!(localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY);
}

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => settings.get(),
    enabled: hasAuth(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string>) => settings.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEYS_KEY,
    queryFn: () => authKeys.list(),
    enabled: hasAuth(),
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      scopes?: string[];
      expires_in_days?: number;
    }) => authKeys.create(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => authKeys.revoke(keyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}
