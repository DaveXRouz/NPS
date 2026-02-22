import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeySection } from "../ApiKeySection";

const mockCreateKey = vi.fn();
const mockRevokeKey = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "settings.api_key_empty": "No API keys yet. Create one to integrate.",
        "settings.api_key_create": "Create New API Key",
        "settings.api_key_name": "Key Name",
        "settings.api_key_expires": "Expires",
        "settings.api_key_never": "Never",
        "settings.api_key_30_days": "30 days",
        "settings.api_key_90_days": "90 days",
        "settings.api_key_1_year": "1 year",
        "settings.api_key_revoke": "Revoke",
        "settings.api_key_warning": "This key will not be shown again.",
        "settings.api_key_copy": "Copy",
        "settings.api_key_copied": "Copied!",
        "settings.api_key_created_at": "Created",
        "settings.api_key_last_used": "Last used",
        "common.cancel": "Cancel",
        "common.confirm": "Confirm",
        "common.loading": "Loading...",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

let mockKeys: Array<{
  id: string;
  name: string;
  created_at: string;
  last_used: string | null;
}> = [];

vi.mock("@/hooks/useSettings", () => ({
  useApiKeys: () => ({ data: mockKeys, isLoading: false }),
  useCreateApiKey: () => ({ mutate: mockCreateKey, isPending: false }),
  useRevokeApiKey: () => ({ mutate: mockRevokeKey }),
}));

describe("ApiKeySection", () => {
  it("renders empty state when no keys", () => {
    mockKeys = [];
    render(<ApiKeySection />);
    expect(
      screen.getByText("No API keys yet. Create one to integrate."),
    ).toBeInTheDocument();
  });

  it("renders existing API keys", () => {
    mockKeys = [
      {
        id: "k1",
        name: "my-bot-key",
        created_at: "2026-01-15T00:00:00Z",
        last_used: null,
      },
      {
        id: "k2",
        name: "test-key",
        created_at: "2026-02-01T00:00:00Z",
        last_used: "2026-02-10T00:00:00Z",
      },
    ];
    render(<ApiKeySection />);
    expect(screen.getByText("my-bot-key")).toBeInTheDocument();
    expect(screen.getByText("test-key")).toBeInTheDocument();
  });

  it("create key form shows on button click", async () => {
    mockKeys = [];
    render(<ApiKeySection />);
    await userEvent.click(screen.getByText(/Create New API Key/));
    expect(screen.getByPlaceholderText("Key Name")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(screen.getByText("30 days")).toBeInTheDocument();
  });

  it("revoke key fires with confirmation", async () => {
    mockKeys = [
      {
        id: "k1",
        name: "my-key",
        created_at: "2026-01-15T00:00:00Z",
        last_used: null,
      },
    ];
    render(<ApiKeySection />);
    // Click Revoke
    await userEvent.click(screen.getByText("Revoke"));
    // Confirmation buttons appear
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    // Click confirm
    await userEvent.click(screen.getByText("Confirm"));
    expect(mockRevokeKey).toHaveBeenCalledWith("k1", expect.anything());
  });
});
