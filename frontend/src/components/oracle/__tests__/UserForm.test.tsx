import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserForm } from "../UserForm";
import type { OracleUser } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "common.loading": "Loading...",
        "common.save": "Save",
        "common.cancel": "Cancel",
        "oracle.new_profile": "New Profile",
        "oracle.edit_profile": "Edit Profile",
        "oracle.add_new_profile": "Add New Profile",
        "oracle.delete_profile": "Delete",
        "oracle.delete_confirm": "Confirm Delete",
        "oracle.section_identity": "Identity",
        "oracle.section_family": "Family",
        "oracle.section_location": "Location",
        "oracle.section_details": "Details",
        "oracle.field_name": "Name",
        "oracle.field_name_persian": "Name (Persian)",
        "oracle.field_birthday": "Birthday",
        "oracle.field_mother_name": "Mother's Name",
        "oracle.field_mother_name_persian": "Mother's Name (Persian)",
        "oracle.field_country": "Country",
        "oracle.field_city": "City",
        "oracle.field_gender": "Gender",
        "oracle.field_heart_rate": "Heart Rate (BPM)",
        "oracle.field_timezone": "Timezone",
        "oracle.gender_unset": "— Select —",
        "oracle.gender_male": "Male",
        "oracle.gender_female": "Female",
        "oracle.timezone_hours": "Hours",
        "oracle.timezone_minutes": "Minutes",
        "oracle.keyboard_toggle": "Toggle keyboard",
        "oracle.error_name_required": "Name must be at least 2 characters",
        "oracle.error_name_no_digits": "Name must not contain digits",
        "oracle.error_birthday_required": "Birthday is required",
        "oracle.error_birthday_future": "Birthday cannot be in the future",
        "oracle.error_birthday_too_old": "Birthday must be after 1900",
        "oracle.error_mother_name_required":
          "Mother's name must be at least 2 characters",
        "oracle.error_heart_rate_range":
          "Heart rate must be between 30 and 220 BPM",
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock child components to isolate UserForm tests
vi.mock("../PersianKeyboard", () => ({
  PersianKeyboard: ({
    onCharacterClick,
    onBackspace,
    onClose,
  }: {
    onCharacterClick: (c: string) => void;
    onBackspace: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="persian-keyboard">
      <button data-testid="kb-char" onClick={() => onCharacterClick("\u0633")}>
        char
      </button>
      <button data-testid="kb-backspace" onClick={onBackspace}>
        back
      </button>
      <button data-testid="kb-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

vi.mock("../CalendarPicker", () => ({
  CalendarPicker: ({
    value,
    onChange,
    label,
    error,
  }: {
    value: string;
    onChange: (d: string) => void;
    label?: string;
    error?: string;
  }) => (
    <div data-testid="calendar-picker">
      <label>{label}</label>
      <input
        data-testid="calendar-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span data-testid="calendar-error">{error}</span>}
    </div>
  ),
}));

vi.mock("../LocationSelector", () => ({
  LocationSelector: ({
    onChange,
  }: {
    value: { lat: number; lon: number; country?: string; city?: string } | null;
    onChange: (d: {
      lat: number;
      lon: number;
      country?: string;
      city?: string;
    }) => void;
  }) => (
    <div data-testid="location-selector">
      <button
        data-testid="set-location"
        onClick={() =>
          onChange({ lat: 35.6892, lon: 51.389, country: "IR", city: "Tehran" })
        }
      >
        Set Location
      </button>
    </div>
  ),
}));

const existingUser: OracleUser = {
  id: 1,
  name: "Alice",
  name_persian: "\u0622\u0644\u06CC\u0633",
  birthday: "1990-01-15",
  mother_name: "Carol",
  mother_name_persian: "\u06A9\u0627\u0631\u0648\u0644",
  country: "US",
  city: "NYC",
  gender: "female",
  heart_rate_bpm: 72,
  timezone_hours: -5,
  timezone_minutes: 0,
  latitude: 40.7128,
  longitude: -74.006,
  created_at: "2024-01-01T00:00:00Z",
};

describe("UserForm", () => {
  // ── Existing tests (kept) ──

  it("renders in create mode with empty fields", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("New Profile")).toBeInTheDocument();
    expect(screen.getByText(/Add New Profile/)).toBeInTheDocument();
  });

  it("renders in edit mode with pre-populated fields", () => {
    render(
      <UserForm
        user={existingUser}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Carol")).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(
      screen.getByText("Name must be at least 2 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("Birthday is required")).toBeInTheDocument();
    expect(
      screen.getByText("Mother's name must be at least 2 characters"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows error for future birthday", async () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "Test User");

    // Fill birthday via CalendarPicker mock
    const calendarInput = screen.getByTestId("calendar-input");
    await userEvent.clear(calendarInput);
    await userEvent.type(calendarInput, "2099-01-01");

    // Fill mother's name
    await userEvent.type(inputs[2], "Mother Test");

    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(
      screen.getByText("Birthday cannot be in the future"),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with form data on valid submission", async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "Test User");

    const calendarInput = screen.getByTestId("calendar-input");
    await userEvent.clear(calendarInput);
    await userEvent.type(calendarInput, "1990-05-15");

    await userEvent.type(inputs[2], "Mother Test");

    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test User",
        birthday: "1990-05-15",
        mother_name: "Mother Test",
      }),
    );
  });

  it("calls onCancel when cancel button clicked", async () => {
    const onCancel = vi.fn();
    render(<UserForm onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when backdrop clicked", async () => {
    const onCancel = vi.fn();
    const { container } = render(
      <UserForm onSubmit={vi.fn()} onCancel={onCancel} />,
    );
    const backdrop = container.querySelector(".fixed")!;
    await userEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows delete button only in edit mode", () => {
    const { rerender } = render(
      <UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();

    rerender(
      <UserForm
        user={existingUser}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("requires two clicks to delete", async () => {
    const onDelete = vi.fn();
    render(
      <UserForm
        user={existingUser}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
      />,
    );
    const deleteBtn = screen.getByText("Delete");
    await userEvent.click(deleteBtn);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Confirm Delete"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("renders Persian fields with RTL direction", () => {
    render(
      <UserForm user={existingUser} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    const persianInput = screen.getByDisplayValue("\u0622\u0644\u06CC\u0633");
    expect(persianInput).toHaveAttribute("dir", "rtl");
  });

  it("clears validation error on field change", async () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(
      screen.getByText("Name must be at least 2 characters"),
    ).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "Te");
    expect(
      screen.queryByText("Name must be at least 2 characters"),
    ).not.toBeInTheDocument();
  });

  it("disables submit button when isSubmitting is true", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting />);
    const submitBtn = screen.getByText("Loading...");
    expect(submitBtn).toBeDisabled();
  });

  // ── New tests for Session 4 ──

  it("renders gender dropdown with male/female options", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const genderSelect = screen.getByTestId("gender-select");
    expect(genderSelect).toBeInTheDocument();
    const options = within(genderSelect).getAllByRole("option");
    expect(options).toHaveLength(3); // unset, male, female
    expect(options[1]).toHaveTextContent("Male");
    expect(options[2]).toHaveTextContent("Female");
  });

  it("renders heart rate BPM input", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const bpmInput = screen.getByTestId("heart-rate-input");
    expect(bpmInput).toBeInTheDocument();
    expect(bpmInput).toHaveAttribute("type", "number");
    expect(bpmInput).toHaveAttribute("min", "30");
    expect(bpmInput).toHaveAttribute("max", "220");
  });

  it("shows error for heart rate outside 30-220 range", async () => {
    // Pre-populate form with invalid BPM via user prop (avoids jsdom number input quirks)
    const invalidBpmUser: OracleUser = {
      ...existingUser,
      heart_rate_bpm: 10,
    };
    const onSubmit = vi.fn();
    render(
      <UserForm user={invalidBpmUser} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    // Verify BPM is pre-populated
    const bpmInput = screen.getByTestId("heart-rate-input") as HTMLInputElement;
    expect(bpmInput.value).toBe("10");

    // Submit form directly via form element
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    // onSubmit should NOT have been called (validation blocks it)
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Heart rate must be between 30 and 220 BPM"),
    ).toBeInTheDocument();
  });

  it("renders timezone selectors", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const tzHours = screen.getByTestId("timezone-hours");
    const tzMinutes = screen.getByTestId("timezone-minutes");
    expect(tzHours).toBeInTheDocument();
    expect(tzMinutes).toBeInTheDocument();

    // Hours has 27 options (-12 to +14)
    const hourOptions = within(tzHours).getAllByRole("option");
    expect(hourOptions).toHaveLength(27);

    // Minutes has 4 options (0, 15, 30, 45)
    const minuteOptions = within(tzMinutes).getAllByRole("option");
    expect(minuteOptions).toHaveLength(4);
  });

  it("shows error for name containing digits", async () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "Test123");

    const calendarInput = screen.getByTestId("calendar-input");
    await userEvent.clear(calendarInput);
    await userEvent.type(calendarInput, "1990-05-15");
    await userEvent.type(inputs[2], "Mother Test");

    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(
      screen.getByText("Name must not contain digits"),
    ).toBeInTheDocument();
  });

  it("shows error for birthday before 1900", async () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "Test User");

    const calendarInput = screen.getByTestId("calendar-input");
    await userEvent.clear(calendarInput);
    await userEvent.type(calendarInput, "1850-01-01");

    await userEvent.type(inputs[2], "Mother Test");

    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(screen.getByText("Birthday must be after 1900")).toBeInTheDocument();
  });

  it("renders CalendarPicker instead of native date input", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("calendar-picker")).toBeInTheDocument();
  });

  it("renders PersianKeyboard toggle buttons for Persian fields", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(
      screen.getByTestId("keyboard-toggle-name_persian"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("keyboard-toggle-mother_name_persian"),
    ).toBeInTheDocument();
  });

  it("toggles PersianKeyboard on button click and inserts character", async () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    // Keyboard not visible initially
    expect(screen.queryByTestId("persian-keyboard")).not.toBeInTheDocument();

    // Click toggle for name_persian
    await userEvent.click(screen.getByTestId("keyboard-toggle-name_persian"));
    await waitFor(() => {
      expect(screen.getByTestId("persian-keyboard")).toBeInTheDocument();
    });

    // Click a character
    await userEvent.click(screen.getByTestId("kb-char"));

    // The character should be appended to the name_persian field
    const persianInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el.getAttribute("dir") === "rtl");
    expect(persianInputs[0]).toHaveValue("\u0633");
  });

  it("renders LocationSelector instead of separate country/city inputs", () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("location-selector")).toBeInTheDocument();
  });

  it("pre-populates all new fields in edit mode", () => {
    render(
      <UserForm user={existingUser} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );

    const genderSelect = screen.getByTestId(
      "gender-select",
    ) as HTMLSelectElement;
    expect(genderSelect.value).toBe("female");

    const bpmInput = screen.getByTestId("heart-rate-input") as HTMLInputElement;
    expect(bpmInput.value).toBe("72");

    const tzHours = screen.getByTestId("timezone-hours") as HTMLSelectElement;
    expect(tzHours.value).toBe("-5");

    const tzMinutes = screen.getByTestId(
      "timezone-minutes",
    ) as HTMLSelectElement;
    expect(tzMinutes.value).toBe("0");
  });

  it("includes all fields in onSubmit payload", async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "Test User");

    const calendarInput = screen.getByTestId("calendar-input");
    await userEvent.clear(calendarInput);
    await userEvent.type(calendarInput, "1990-05-15");

    await userEvent.type(inputs[2], "Mother Test");

    // Set gender
    await userEvent.selectOptions(screen.getByTestId("gender-select"), "male");

    // Set heart rate (fireEvent for number inputs in jsdom)
    fireEvent.change(screen.getByTestId("heart-rate-input"), {
      target: { value: "75" },
    });

    await userEvent.click(screen.getByText(/Add New Profile/));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test User",
        birthday: "1990-05-15",
        mother_name: "Mother Test",
        gender: "male",
        heart_rate_bpm: 75,
        timezone_hours: 0,
        timezone_minutes: 0,
      }),
    );
  });
});
