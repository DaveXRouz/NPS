import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "@/pages/Settings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "settings.title": "Settings",
        "settings.profile": "Profile",
        "settings.profile_desc": "Manage your account information",
        "settings.preferences": "Preferences",
        "settings.preferences_desc": "Language, theme, and display options",
        "settings.oracle": "Oracle Settings",
        "settings.oracle_desc": "Default reading preferences",
        "settings.api_keys": "API Keys",
        "settings.api_keys_desc": "Manage programmatic access to NPS",
        "settings.about": "About",
        "settings.about_desc": "Application information and credits",
        "settings.display_name": "Display Name",
        "settings.change_password": "Change Password",
        "settings.current_password": "Current Password",
        "settings.new_password": "New Password",
        "settings.confirm_password": "Confirm New Password",
        "settings.language": "Language",
        "settings.theme": "Theme",
        "settings.theme_dark": "Dark",
        "settings.theme_light": "Light",
        "settings.timezone": "Timezone",
        "settings.numerology_system": "Numerology System",
        "settings.numerology_pythagorean": "Pythagorean",
        "settings.numerology_chaldean": "Chaldean",
        "settings.numerology_abjad": "Abjad",
        "settings.default_reading_type": "Default Reading Type",
        "settings.auto_daily": "Auto-generate daily reading",
        "settings.auto_daily_desc": "Automatically create a reading each day",
        "settings.api_key_empty": "No API keys yet.",
        "settings.api_key_create": "Create New API Key",
        "settings.about_app": "App",
        "settings.about_version": "Version",
        "settings.about_framework": "Framework",
        "settings.about_author": "Author",
        "settings.about_repo": "Repository",
        "settings.about_credits": "Credits",
        "common.loading": "Loading...",
        "dashboard.type_time": "Time",
        "dashboard.type_name": "Name",
        "dashboard.type_question": "Question",
        "dashboard.type_daily": "Daily",
        "settings.lang_english": "English",
        "settings.lang_persian": "Persian",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ data: { settings: {} }, isLoading: false }),
  useUpdateSettings: () => ({ mutate: vi.fn() }),
  useApiKeys: () => ({ data: [], isLoading: false }),
  useCreateApiKey: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeApiKey: () => ({ mutate: vi.fn() }),
}));

describe("Settings Page", () => {
  it("renders all 5 settings sections", () => {
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Oracle Settings")).toBeInTheDocument();
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("sections collapse and expand", async () => {
    render(<Settings />);
    // Profile is defaultOpen, so "Display Name" should be visible
    expect(screen.getByText("Display Name")).toBeInTheDocument();

    // Click Profile header to collapse
    await userEvent.click(screen.getByText("Profile"));
    expect(screen.queryByText("Display Name")).not.toBeInTheDocument();

    // Click to expand again
    await userEvent.click(screen.getByText("Profile"));
    expect(screen.getByText("Display Name")).toBeInTheDocument();
  });

  it("profile section shows password form", () => {
    render(<Settings />);
    // "Change Password" appears as both heading and button — check for at least one
    expect(
      screen.getAllByText("Change Password").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText("Current Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New Password")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Confirm New Password"),
    ).toBeInTheDocument();
  });

  it("preferences section shows language selector", async () => {
    render(<Settings />);
    // Expand Preferences
    await userEvent.click(screen.getByText("Preferences"));
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("oracle settings shows reading type dropdown", async () => {
    render(<Settings />);
    // Expand Oracle Settings
    await userEvent.click(screen.getByText("Oracle Settings"));
    expect(screen.getByText("Default Reading Type")).toBeInTheDocument();
  });

  it("about section shows app info", async () => {
    render(<Settings />);
    // Expand About
    await userEvent.click(screen.getByText("About"));
    expect(
      screen.getByText("NPS — Numerology Puzzle Solver"),
    ).toBeInTheDocument();
    expect(screen.getByText("4.0.0")).toBeInTheDocument();
  });
});
