import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axeCore from "axe-core";
import { ReadingResults } from "../ReadingResults";
import { UserForm } from "../UserForm";
import { TranslatedReading } from "../TranslatedReading";
import { LanguageToggle } from "../../LanguageToggle";
import { LogPanel } from "../../LogPanel";
import { StatsCard } from "../../StatsCard";
import { SkipNavLink } from "../../SkipNavLink";

// ─── i18n mock ───
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.tab_summary": "Summary",
        "oracle.tab_details": "Details",
        "oracle.tab_history": "History",
        "oracle.new_profile": "New Profile",
        "oracle.edit_profile": "Edit Profile",
        "oracle.field_name": "Name",
        "oracle.field_name_persian": "Persian Name",
        "oracle.field_birthday": "Birthday",
        "oracle.field_mother_name": "Mother Name",
        "oracle.field_mother_name_persian": "Mother Persian Name",
        "oracle.field_country": "Country",
        "oracle.field_city": "City",
        "oracle.error_name_required": "Name is required",
        "oracle.error_birthday_required": "Birthday is required",
        "oracle.error_mother_name_required": "Mother name is required",
        "oracle.error_birthday_future": "Birthday cannot be in the future",
        "oracle.add_new_profile": "Add Profile",
        "oracle.delete_profile": "Delete",
        "oracle.delete_confirm": "Confirm Delete",
        "oracle.section_identity": "Identity",
        "oracle.section_family": "Family",
        "oracle.section_location": "Location",
        "oracle.section_details": "Details",
        "oracle.field_gender": "Gender",
        "oracle.field_heart_rate": "Heart Rate (BPM)",
        "oracle.field_timezone": "Timezone",
        "oracle.gender_unset": "— Select —",
        "oracle.gender_male": "Male",
        "oracle.gender_female": "Female",
        "oracle.timezone_hours": "Hours",
        "oracle.timezone_minutes": "Minutes",
        "oracle.keyboard_toggle": "Toggle keyboard",
        "oracle.translate": "Translate to Persian",
        "oracle.translating": "Translating...",
        "oracle.show_original": "Show original",
        "oracle.show_translation": "Show translation",
        "oracle.results_placeholder": "Results will appear here.",
        "oracle.details_placeholder": "Submit a reading to see details.",
        "oracle.details_heartbeat": "Heartbeat",
        "oracle.details_location_element": "Location Element",
        "oracle.export_text": "Export TXT",
        "oracle.export_json": "Export JSON",
        "oracle.error_heart_rate_range": "Heart rate must be 30-220",
        "oracle.error_name_no_digits": "No digits in name",
        "oracle.error_birthday_too_old": "Birthday after 1900",
        "a11y.skip_to_content": "Skip to content",
        "a11y.filter_readings": "Filter readings",
        "common.loading": "Loading...",
        "common.save": "Save",
        "common.cancel": "Cancel",
      };
      return map[key] || key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

// ─── Child component mocks ───
vi.mock("../SummaryTab", () => ({
  SummaryTab: () => <div data-testid="summary-tab">Summary Content</div>,
}));
vi.mock("../DetailsTab", () => ({
  DetailsTab: () => <div data-testid="details-tab">Details Content</div>,
}));
vi.mock("../ReadingHistory", () => ({
  ReadingHistory: () => <div data-testid="history-tab">History Content</div>,
}));
vi.mock("../ExportButton", () => ({
  ExportButton: () => <button aria-label="Export TXT">Export</button>,
}));
vi.mock("../ShareButton", () => ({
  ShareButton: () => <button>Share</button>,
}));
vi.mock("../HeartbeatDisplay", () => ({
  HeartbeatDisplay: () => <div>Heartbeat</div>,
}));
vi.mock("../LocationDisplay", () => ({
  LocationDisplay: () => <div>Location</div>,
}));
vi.mock("../ConfidenceMeter", () => ({
  ConfidenceMeter: () => <div>Confidence</div>,
}));
vi.mock("../ReadingFeedback", () => ({
  ReadingFeedback: () => <div>Feedback</div>,
}));
vi.mock("../PersianKeyboard", () => ({
  PersianKeyboard: () => <div data-testid="persian-keyboard" />,
}));
vi.mock("../CalendarPicker", () => ({
  CalendarPicker: ({
    label,
    error,
  }: {
    value: string;
    onChange: (d: string) => void;
    label?: string;
    error?: string;
  }) => (
    <div data-testid="calendar-picker">
      <label htmlFor="mock-calendar-input">{label}</label>
      <input
        id="mock-calendar-input"
        data-testid="calendar-input"
        type="date"
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));
vi.mock("../LocationSelector", () => ({
  LocationSelector: () => <div data-testid="location-selector" />,
}));
vi.mock("@/services/api", () => ({
  translation: {
    translate: vi.fn(),
  },
}));

// ─── axe-core helper ───
async function checkA11y(container: HTMLElement, rules?: string[]) {
  const options: axeCore.RunOptions = rules
    ? {
        rules: Object.fromEntries(rules.map((r) => [r, { enabled: true }])),
      }
    : {};
  const results = await axeCore.run(container, options);
  const violations = results.violations.filter(
    (v: axeCore.Result) => v.impact === "critical" || v.impact === "serious",
  );
  if (violations.length > 0) {
    const msgs = violations.map(
      (v: axeCore.Result) =>
        `${v.impact}: ${v.description}\n  ${v.nodes.map((n: axeCore.NodeResult) => n.html).join("\n  ")}`,
    );
    throw new Error(`axe violations:\n${msgs.join("\n\n")}`);
  }
}

// ─── Category A: axe-core Automated Checks ───
describe("axe-core automated checks", () => {
  it("A2: UserForm dialog has no critical violations", async () => {
    const { container } = render(
      <UserForm onSubmit={() => {}} onCancel={() => {}} />,
    );
    await checkA11y(container);
  });

  it("A4: ReadingResults tabs have no critical violations", async () => {
    const { container } = render(<ReadingResults result={null} />);
    await checkA11y(container);
  });
});

// ─── Category B: Keyboard Navigation ───
describe("keyboard navigation", () => {
  it("B1: skip-nav link renders with correct href", () => {
    render(<SkipNavLink />);
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link.getAttribute("href")).toBe("#main-content");
  });

  it("B3: ReadingResults tabs navigate with arrow keys", async () => {
    const user = userEvent.setup();
    render(<ReadingResults result={null} />);

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[0]); // Focus Summary tab
    await user.keyboard("{ArrowRight}");

    // After ArrowRight, second tab should be active
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  });

  it("B4: ReadingResults Home/End jump to first/last tab", async () => {
    const user = userEvent.setup();
    render(<ReadingResults result={null} />);

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[1]); // Focus Details tab
    await user.keyboard("{Home}");

    expect(tabs[0].getAttribute("aria-selected")).toBe("true");

    await user.click(tabs[0]);
    await user.keyboard("{End}");

    expect(tabs[2].getAttribute("aria-selected")).toBe("true");
  });

  it("B6: UserForm Escape closes dialog", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<UserForm onSubmit={() => {}} onCancel={onCancel} />);

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });
});

// ─── Category C: Screen Reader / ARIA ───
describe("ARIA roles and attributes", () => {
  it("C2: ReadingResults tablist has correct ARIA roles", () => {
    render(<ReadingResults result={null} />);

    expect(screen.getByRole("tablist")).toBeDefined();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);

    const panels = screen.getAllByRole("tabpanel");
    expect(panels).toHaveLength(3);

    // aria-selected
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");

    // aria-controls
    expect(tabs[0].getAttribute("aria-controls")).toBe("tabpanel-summary");
    expect(tabs[1].getAttribute("aria-controls")).toBe("tabpanel-details");
    expect(tabs[2].getAttribute("aria-controls")).toBe("tabpanel-history");

    // aria-labelledby on panels
    expect(panels[0].getAttribute("aria-labelledby")).toBe("tab-summary");
    expect(panels[1].getAttribute("aria-labelledby")).toBe("tab-details");
    expect(panels[2].getAttribute("aria-labelledby")).toBe("tab-history");
  });

  it("C3: UserForm dialog has aria-modal", () => {
    render(<UserForm onSubmit={() => {}} onCancel={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("C4: UserForm inputs have aria-required for required fields", () => {
    render(<UserForm onSubmit={() => {}} onCancel={() => {}} />);
    const nameInput = screen.getByLabelText(/^Name/);
    expect(nameInput.getAttribute("aria-required")).toBe("true");
    const motherInput = screen.getByLabelText(/^Mother Name/);
    expect(motherInput.getAttribute("aria-required")).toBe("true");
  });

  it("C5: UserForm errors linked via aria-describedby", async () => {
    const user = userEvent.setup();
    render(<UserForm onSubmit={() => {}} onCancel={() => {}} />);

    const submitButton = screen.getByText("Add Profile");
    await user.click(submitButton);

    // At least one input should have aria-invalid=true
    const invalidInputs = document.querySelectorAll('[aria-invalid="true"]');
    expect(invalidInputs.length).toBeGreaterThan(0);

    // Each invalid input should have aria-describedby
    invalidInputs.forEach((input) => {
      const describedBy = input.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const errorEl = document.getElementById(describedBy!);
      expect(errorEl).toBeTruthy();
    });
  });

  it("C8: error messages have role=alert", async () => {
    const user = userEvent.setup();
    render(<UserForm onSubmit={() => {}} onCancel={() => {}} />);

    const submitButton = screen.getByText("Add Profile");
    await user.click(submitButton);

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("C9: LogPanel has role=log", () => {
    render(
      <LogPanel
        title="Test Log"
        entries={[{ timestamp: "12:00", message: "Hello" }]}
      />,
    );
    const log = screen.getByRole("log");
    expect(log).toBeDefined();
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(log.getAttribute("aria-label")).toBe("Test Log");
  });

  it("C10: StatsCard has role=group and aria-label", () => {
    render(<StatsCard label="Total" value={42} />);
    const group = screen.getByRole("group");
    expect(group).toBeDefined();
    expect(group.getAttribute("aria-label")).toBe("Total");
  });
});

// ─── Category D: Live Regions & Dynamic Content ───
describe("live regions and dynamic content", () => {
  it("D1: error messages appear in aria-live region", async () => {
    const user = userEvent.setup();
    render(<UserForm onSubmit={() => {}} onCancel={() => {}} />);

    const submitButton = screen.getByText("Add Profile");
    await user.click(submitButton);

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    // alert role implicitly has aria-live="assertive"
    expect(alerts[0].textContent).toBeTruthy();
  });

  it("D3: ReadingResults panel has aria-live on active tab", () => {
    render(<ReadingResults result={null} />);

    // Active panel (summary) should have aria-live
    const summaryPanel = document.getElementById("tabpanel-summary");
    expect(summaryPanel?.getAttribute("aria-live")).toBe("polite");

    // Inactive panels should NOT have aria-live
    const detailsPanel = document.getElementById("tabpanel-details");
    expect(detailsPanel?.getAttribute("aria-live")).toBeNull();
  });

  it("D3b: switching tabs updates aria-live", async () => {
    const user = userEvent.setup();
    render(<ReadingResults result={null} />);

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[1]); // Switch to Details

    const summaryPanel = document.getElementById("tabpanel-summary");
    const detailsPanel = document.getElementById("tabpanel-details");

    expect(summaryPanel?.getAttribute("aria-live")).toBeNull();
    expect(detailsPanel?.getAttribute("aria-live")).toBe("polite");
  });

  it("D2: TranslatedReading has aria-live for content", () => {
    render(<TranslatedReading reading="Test reading" />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });
});

// ─── Category E: Persian Accessibility ───
describe("persian accessibility", () => {
  it("E2: UserForm Persian name field has lang=fa", () => {
    render(<UserForm onSubmit={() => {}} onCancel={() => {}} />);
    const persianInput = screen.getByLabelText("Persian Name");
    expect(persianInput.getAttribute("lang")).toBe("fa");
    expect(persianInput.getAttribute("dir")).toBe("auto");
  });

  it("E4: LanguageToggle has role=switch and aria-checked", () => {
    render(<LanguageToggle />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeDefined();
    // Default language is "en", so aria-checked should be false
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });
});

// ─── Category F: Color Contrast (via axe-core) ───
describe("color contrast", () => {
  it("F1: axe-core reports no contrast violations on ReadingResults", async () => {
    const { container } = render(<ReadingResults result={null} />);
    await checkA11y(container, ["color-contrast"]);
  });

  it("F2: axe-core reports no contrast violations on UserForm", async () => {
    const { container } = render(
      <UserForm onSubmit={() => {}} onCancel={() => {}} />,
    );
    await checkA11y(container, ["color-contrast"]);
  });
});

// ─── Extra: Roving Tabindex ───
describe("roving tabindex", () => {
  it("active tab has tabIndex=0, others have tabIndex=-1", () => {
    render(<ReadingResults result={null} />);
    const tabs = screen.getAllByRole("tab");

    // Summary is active by default
    expect(tabs[0].getAttribute("tabindex")).toBe("0");
    expect(tabs[1].getAttribute("tabindex")).toBe("-1");
    expect(tabs[2].getAttribute("tabindex")).toBe("-1");
  });

  it("roving tabindex updates on tab switch", async () => {
    const user = userEvent.setup();
    render(<ReadingResults result={null} />);
    const tabs = screen.getAllByRole("tab");

    await user.click(tabs[1]); // Switch to Details

    expect(tabs[0].getAttribute("tabindex")).toBe("-1");
    expect(tabs[1].getAttribute("tabindex")).toBe("0");
    expect(tabs[2].getAttribute("tabindex")).toBe("-1");
  });
});

// ─── Extra: Dialog Focus Management ───
describe("dialog focus management", () => {
  it("UserForm dialog label matches mode", () => {
    const { rerender } = render(
      <UserForm onSubmit={() => {}} onCancel={() => {}} />,
    );
    let dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("New Profile");

    rerender(
      <UserForm
        user={{
          id: 1,
          name: "Test",
          birthday: "2000-01-01",
          mother_name: "Mom",
          created_at: "",
          updated_at: "",
        }}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("Edit Profile");
  });
});

// ─── Extra: Tab Panels ───
describe("tab panels content visibility", () => {
  it("has tabpanel for each tab with aria-labelledby", () => {
    render(<ReadingResults result={null} />);
    const panels = screen.getAllByRole("tabpanel");
    expect(panels).toHaveLength(3);

    expect(panels[0].getAttribute("aria-labelledby")).toBe("tab-summary");
    expect(panels[1].getAttribute("aria-labelledby")).toBe("tab-details");
    expect(panels[2].getAttribute("aria-labelledby")).toBe("tab-history");
  });

  it("tabs have aria-controls pointing to panels", () => {
    render(<ReadingResults result={null} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].getAttribute("aria-controls")).toBe("tabpanel-summary");
    expect(tabs[1].getAttribute("aria-controls")).toBe("tabpanel-details");
    expect(tabs[2].getAttribute("aria-controls")).toBe("tabpanel-history");
  });
});
