import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiKeyDisplay, SettingsResponse } from "@/types";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token =
    localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

const SETTINGS_KEY = ["userSettings"] as const;
const API_KEYS_KEY = ["apiKeys"] as const;

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => fetchJson<SettingsResponse>(`${API_BASE}/settings`),
    enabled: !!(
      localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY
    ),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetchJson<SettingsResponse>(`${API_BASE}/settings`, {
        method: "PUT",
        body: JSON.stringify({ settings: data }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEYS_KEY,
    queryFn: () => fetchJson<ApiKeyDisplay[]>(`${API_BASE}/auth/api-keys`),
    enabled: !!(
      localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY
    ),
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      scopes?: string[];
      expires_in_days?: number;
    }) =>
      fetchJson<ApiKeyDisplay>(`${API_BASE}/auth/api-keys`, {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      fetchJson<{ detail: string }>(`${API_BASE}/auth/api-keys/${keyId}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}
