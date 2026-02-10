import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfileList } from "../UserProfileList";
import type { OracleUser } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.add_new_profile": "Add New Profile",
        "oracle.search_profiles": "Search profiles...",
        "oracle.no_profiles": "No profiles yet",
        "oracle.no_profiles_match": "No profiles match your search",
        "oracle.create_first_profile": "Create your first profile",
        "oracle.error_loading_profiles": "Failed to load profiles",
        "oracle.new_profile": "New Profile",
        "oracle.edit_profile": "Edit Profile",
        "oracle.delete_profile": "Delete Profile",
        "oracle.gender_male": "Male",
        "oracle.gender_female": "Female",
        "common.retry": "Retry",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.loading": "Loading...",
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
        "oracle.field_gender": "Gender",
        "oracle.field_heart_rate": "Heart Rate (BPM)",
        "oracle.field_timezone": "Timezone",
        "oracle.gender_unset": "— Select —",
        "oracle.timezone_hours": "Hours",
        "oracle.timezone_minutes": "Minutes",
        "oracle.keyboard_toggle": "Toggle keyboard",
        "oracle.error_name_required": "Name must be at least 2 characters",
        "oracle.error_birthday_required": "Birthday is required",
        "oracle.error_mother_name_required":
          "Mother's name must be at least 2 characters",
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock child components
vi.mock("../PersianKeyboard", () => ({
  PersianKeyboard: () => <div data-testid="persian-keyboard" />,
}));

vi.mock("../CalendarPicker", () => ({
  CalendarPicker: ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (d: string) => void;
    label?: string;
  }) => (
    <div data-testid="calendar-picker">
      <label>{label}</label>
      <input
        data-testid="calendar-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock("../LocationSelector", () => ({
  LocationSelector: () => <div data-testid="location-selector" />,
}));

const mockUsers: OracleUser[] = [
  {
    id: 1,
    name: "Alice",
    name_persian: "\u0622\u0644\u06CC\u0633",
    birthday: "1990-01-15",
    mother_name: "Carol",
    country: "US",
    city: "NYC",
  },
  {
    id: 2,
    name: "Bob",
    birthday: "1985-06-20",
    mother_name: "Diana",
    country: "UK",
    city: "London",
  },
  {
    id: 3,
    name: "Charlie",
    birthday: "1995-03-10",
    mother_name: "Eve",
  },
];

const mockRefetch = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

// Track hook return values so individual tests can override
let mockQueryReturn: Record<string, unknown> = {
  data: mockUsers,
  isLoading: false,
  isError: false,
  refetch: mockRefetch,
};

vi.mock("@/hooks/useOracleUsers", () => ({
  useOracleUsers: () => mockQueryReturn,
  useCreateOracleUser: () => ({
    mutate: mockCreateMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useUpdateOracleUser: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeleteOracleUser: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe("UserProfileList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryReturn = {
      data: mockUsers,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
  });

  it("renders a UserCard for each user", () => {
    render(<UserProfileList />);
    expect(screen.getByTestId("user-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("user-card-3")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("filters users by search query", async () => {
    render(<UserProfileList />);
    const searchInput = screen.getByTestId("profile-search");
    await userEvent.type(searchInput, "Alice");
    expect(screen.getByTestId("user-card-1")).toBeInTheDocument();
    expect(screen.queryByTestId("user-card-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("user-card-3")).not.toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockQueryReturn = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    };
    render(<UserProfileList />);
    expect(screen.getByTestId("profile-list-loading")).toBeInTheDocument();
  });

  it("shows empty state when no users", () => {
    mockQueryReturn = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
    render(<UserProfileList />);
    expect(screen.getByTestId("profile-list-empty")).toBeInTheDocument();
    expect(screen.getByText("No profiles yet")).toBeInTheDocument();
  });

  it("opens UserForm when Add New Profile clicked", async () => {
    render(<UserProfileList />);
    await userEvent.click(screen.getByTestId("add-profile-btn"));
    expect(screen.getByText("New Profile")).toBeInTheDocument();
  });

  it("opens UserForm in edit mode when edit button clicked on card", async () => {
    render(<UserProfileList />);
    await userEvent.click(screen.getByTestId("edit-user-1"));
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
  });
});
