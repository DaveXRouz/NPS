/**
 * NPS API client — typed fetch wrappers for all endpoints.
 */

import i18n from "@/i18n/config";

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
  get isServerError(): boolean {
    return this.status >= 500;
  }
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

const HTTP_ERROR_KEYS: Record<number, string> = {
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.not_found",
};

function localizedHttpError(status: number): string {
  const key = HTTP_ERROR_KEYS[status];
  if (key) return i18n.t(key);
  if (status >= 500) return i18n.t("errors.server");
  return `HTTP ${status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // Only set Content-Type for requests that may have a body
  if (method !== "GET" && method !== "HEAD" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Auth token: JWT from localStorage or fallback to API key from env
  const token =
    localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY;
  if (token && token !== "undefined")
    headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    // Re-throw AbortError so callers can distinguish cancellation from network errors
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(i18n.t("errors.network"), 0);
  }

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    const detail = body.detail || localizedHttpError(response.status);
    throw new ApiError(detail, response.status, detail);
  }

  return response.json();
}

// ─── Health ───

export const health = {
  check: () => request<{ status: string; version: string }>("/health"),
  ready: () =>
    request<{ status: string; checks: Record<string, string> }>(
      "/health/ready",
    ),
};

// ─── Oracle ───

export const oracle = {
  reading: (datetime?: string) =>
    request<import("@/types").OracleReading>("/oracle/reading", {
      method: "POST",
      body: JSON.stringify({ datetime }),
    }),
  question: (
    question: string,
    userId?: number,
    system?: string,
    signal?: AbortSignal,
    category?: string,
    questionTime?: string,
  ) =>
    request<import("@/types").QuestionReadingResult>("/oracle/question", {
      method: "POST",
      body: JSON.stringify({
        question,
        user_id: userId,
        numerology_system: system || "auto",
        include_ai: true,
        ...(category ? { category } : {}),
        ...(questionTime ? { question_time: questionTime } : {}),
      }),
      signal,
    }),
  name: (
    name: string,
    userId?: number,
    system?: string,
    motherName?: string,
    signal?: AbortSignal,
  ) =>
    request<import("@/types").NameReading>("/oracle/name", {
      method: "POST",
      body: JSON.stringify({
        name,
        ...(motherName ? { mother_name: motherName } : {}),
        user_id: userId,
        numerology_system: system || "pythagorean",
        include_ai: true,
      }),
      signal,
    }),
  daily: (date?: string) =>
    request(`/oracle/daily${date ? `?date=${date}` : ""}`),
  suggestRange: (data: {
    scanned_ranges: string[];
    puzzle_number: number;
    ai_level: number;
  }) =>
    request("/oracle/suggest-range", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  history: (params?: import("@/types").ReadingSearchParams) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined)
      query.set("offset", String(params.offset));
    if (params?.sign_type) query.set("sign_type", params.sign_type);
    if (params?.search) query.set("search", params.search);
    if (params?.date_from) query.set("date_from", params.date_from);
    if (params?.date_to) query.set("date_to", params.date_to);
    if (params?.is_favorite !== undefined)
      query.set("is_favorite", String(params.is_favorite));
    if (params?.sort_by) query.set("sort_by", params.sort_by);
    if (params?.sort_order) query.set("sort_order", params.sort_order);
    return request<import("@/types").StoredReadingListResponse>(
      `/oracle/readings?${query}`,
    );
  },
  getReading: (id: number) =>
    request<import("@/types").StoredReading>(`/oracle/readings/${id}`),
  deleteReading: (id: number) =>
    request<void>(`/oracle/readings/${id}`, { method: "DELETE" }),
  toggleFavorite: (id: number) =>
    request<import("@/types").StoredReading>(
      `/oracle/readings/${id}/favorite`,
      { method: "PATCH" },
    ),
  readingStats: () =>
    request<import("@/types").ReadingStats>("/oracle/readings/stats"),
  validateStamp: (stamp: string) =>
    request<import("@/types").StampValidateResponse>("/oracle/validate-stamp", {
      method: "POST",
      body: JSON.stringify({ stamp }),
    }),
  timeReading: (
    data: import("@/types").TimeReadingRequest,
    signal?: AbortSignal,
  ) =>
    request<import("@/types").FrameworkReadingResponse>("/oracle/readings", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),
  dailyReading: (data: import("@/types").DailyReadingRequest) =>
    request<import("@/types").FrameworkReadingResponse>("/oracle/readings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getDailyReading: (userId: number, date?: string) =>
    request<import("@/types").DailyReadingCacheResponse>(
      `/oracle/daily/reading?user_id=${userId}${date ? `&date=${date}` : ""}`,
    ),
  multiUserFrameworkReading: (
    data: import("@/types").MultiUserFrameworkRequest,
  ) =>
    request<import("@/types").MultiUserFrameworkResponse>("/oracle/readings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Dashboard ───

export const dashboard = {
  stats: () => request<import("@/types").DashboardStats>("/oracle/stats"),
};

// ─── Oracle Users ───

export const oracleUsers = {
  list: async (): Promise<import("@/types").OracleUser[]> => {
    const resp = await request<{
      users: import("@/types").OracleUser[];
      total: number;
      limit: number;
      offset: number;
    }>("/oracle/users");
    return resp.users;
  },
  get: (id: number) =>
    request<import("@/types").OracleUser>(`/oracle/users/${id}`),
  create: (data: import("@/types").OracleUserCreate) =>
    request<import("@/types").OracleUser>("/oracle/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: import("@/types").OracleUserUpdate) =>
    request<import("@/types").OracleUser>(`/oracle/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/oracle/users/${id}`, { method: "DELETE" }),
};

// ─── Vault ───

export const vault = {
  findings: (params?: { limit?: number; offset?: number; chain?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined)
      query.set("offset", String(params.offset));
    if (params?.chain) query.set("chain", params.chain);
    return request<import("@/types").Finding[]>(`/vault/findings?${query}`);
  },
  summary: () => request<import("@/types").VaultSummary>("/vault/summary"),
  search: (q: string) =>
    request<import("@/types").Finding[]>(`/vault/search?q=${q}`),
  export: (format: "json" | "csv") =>
    request("/vault/export", {
      method: "POST",
      body: JSON.stringify({ format }),
    }),
};

// ─── Share ───

export const share = {
  create: (readingId: number, expiresInDays?: number) =>
    request<import("@/types").ShareLink>("/share", {
      method: "POST",
      body: JSON.stringify({
        reading_id: readingId,
        expires_in_days: expiresInDays,
      }),
    }),
  get: (token: string) =>
    request<import("@/types").SharedReadingData>(`/share/${token}`),
  revoke: (token: string) =>
    request<void>(`/share/${token}`, { method: "DELETE" }),
};

// ─── Translation ───

export const translation = {
  translate: (text: string, sourceLang = "en", targetLang = "fa") =>
    request<import("@/types").TranslateResponse>("/translation/translate", {
      method: "POST",
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    }),
  detect: (text: string) =>
    request<import("@/types").DetectResponse>(
      `/translation/detect?text=${encodeURIComponent(text)}`,
    ),
};

// ─── Learning ───

export const learning = {
  stats: () => request<import("@/types").LearningStats>("/learning/stats"),
  insights: (limit?: number) =>
    request<import("@/types").Insight[]>(
      `/learning/insights?limit=${limit || 10}`,
    ),
  analyze: (data: { session_id: string }) =>
    request("/learning/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  weights: () =>
    request<{ weights: Record<string, number> }>("/learning/weights"),
  patterns: () => request("/learning/patterns"),
  feedback: {
    submit: (readingId: number, data: import("@/types").FeedbackRequest) =>
      request<import("@/types").FeedbackResponse>(
        `/learning/oracle/readings/${readingId}/feedback`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    get: (readingId: number) =>
      request<import("@/types").FeedbackResponse[]>(
        `/learning/oracle/readings/${readingId}/feedback`,
      ),
  },
  learningStats: {
    get: () =>
      request<import("@/types").OracleLearningStats>("/learning/oracle/stats"),
    recalculate: () =>
      request<import("@/types").OracleLearningStats>(
        "/learning/oracle/recalculate",
        { method: "POST" },
      ),
  },
};

// ─── Admin ───

export const admin = {
  listUsers: (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined)
      query.set("offset", String(params.offset));
    if (params?.search) query.set("search", params.search);
    if (params?.sort_by) query.set("sort_by", params.sort_by);
    if (params?.sort_order) query.set("sort_order", params.sort_order);
    return request<import("@/types").SystemUserListResponse>(
      `/admin/users?${query}`,
    );
  },
  getUser: (id: string) =>
    request<import("@/types").SystemUser>(`/admin/users/${id}`),
  updateRole: (id: string, role: string) =>
    request<import("@/types").SystemUser>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  resetPassword: (id: string) =>
    request<import("@/types").PasswordResetResult>(
      `/admin/users/${id}/reset-password`,
      { method: "POST" },
    ),
  updateStatus: (id: string, is_active: boolean) =>
    request<import("@/types").SystemUser>(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    }),
  stats: () => request<import("@/types").AdminStats>("/admin/stats"),
  listProfiles: (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    include_deleted?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined)
      query.set("offset", String(params.offset));
    if (params?.search) query.set("search", params.search);
    if (params?.sort_by) query.set("sort_by", params.sort_by);
    if (params?.sort_order) query.set("sort_order", params.sort_order);
    if (params?.include_deleted)
      query.set("include_deleted", String(params.include_deleted));
    return request<import("@/types").AdminOracleProfileListResponse>(
      `/admin/profiles?${query}`,
    );
  },
  deleteProfile: (id: number) =>
    request<void>(`/admin/profiles/${id}`, { method: "DELETE" }),
  backups: () =>
    request<import("@/types").BackupListResponse>("/admin/backups"),
  triggerBackup: (backupType: string) =>
    request<import("@/types").BackupTriggerResponse>("/admin/backups", {
      method: "POST",
      body: JSON.stringify({ backup_type: backupType }),
    }),
  restoreBackup: (filename: string) =>
    request<import("@/types").RestoreResponse>("/admin/backups/restore", {
      method: "POST",
      body: JSON.stringify({ filename, confirm: true }),
    }),
  deleteBackup: (filename: string) =>
    request<import("@/types").BackupDeleteResponse>(
      `/admin/backups/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    ),
};

// ─── Settings ───

export const settings = {
  get: () => request<import("@/types").SettingsResponse>("/settings"),
  update: (data: Record<string, string>) =>
    request<import("@/types").SettingsResponse>("/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: data }),
    }),
};

// ─── Auth API Keys ───

export const authKeys = {
  list: () => request<import("@/types").ApiKeyDisplay[]>("/auth/api-keys"),
  create: (params: {
    name: string;
    scopes?: string[];
    expires_in_days?: number;
  }) =>
    request<import("@/types").ApiKeyDisplay>("/auth/api-keys", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  revoke: (keyId: string) =>
    request<{ detail: string }>(`/auth/api-keys/${keyId}`, {
      method: "DELETE",
    }),
};

// ─── Admin Health / Monitoring (Session 39) ───

export const adminHealth = {
  detailed: () => request<import("@/types").DetailedHealth>("/health/detailed"),
  logs: (params?: {
    limit?: number;
    offset?: number;
    severity?: string;
    search?: string;
    hours?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined)
      query.set("offset", String(params.offset));
    if (params?.severity) query.set("severity", params.severity);
    if (params?.search) query.set("search", params.search);
    if (params?.hours) query.set("hours", String(params.hours));
    return request<import("@/types").LogsResponse>(`/health/logs?${query}`);
  },
  analytics: (days = 30) =>
    request<import("@/types").AnalyticsResponse>(
      `/health/analytics?days=${days}`,
    ),
};
