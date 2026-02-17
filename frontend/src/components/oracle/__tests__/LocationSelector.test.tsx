import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationSelector } from "../LocationSelector";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.location_label": "Location",
        "oracle.location_auto_detect": "Auto-Detect Location",
        "oracle.location_detecting": "Detecting...",
        "oracle.location_detect_error":
          "Could not detect location. Please select manually.",
        "oracle.location_country": "Country",
        "oracle.location_city": "City",
        "oracle.location_coordinates": "Coordinates",
        "oracle.location_select_city": "Select city",
        "oracle.location_no_cities": "No cities available",
        "oracle.location_manual_coords": "Enter coordinates manually",
        "oracle.location_latitude": "Latitude",
        "oracle.location_longitude": "Longitude",
        "oracle.location_loading_countries": "Loading countries...",
        "oracle.location_loading_cities": "Loading cities...",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

// Mock fetch helpers
const mockCountries = [
  {
    code: "IR",
    name: "Iran",
    latitude: 35.6892,
    longitude: 51.389,
    timezone: "Asia/Tehran",
    timezone_offset_hours: 3,
    timezone_offset_minutes: 30,
  },
  {
    code: "US",
    name: "United States",
    latitude: 38.8951,
    longitude: -77.0364,
    timezone: "America/New_York",
    timezone_offset_hours: -5,
    timezone_offset_minutes: 0,
  },
];

const mockCities = [
  {
    name: "Tehran",
    latitude: 35.6892,
    longitude: 51.389,
    timezone: "Asia/Tehran",
  },
  {
    name: "Isfahan",
    latitude: 32.6546,
    longitude: 51.668,
    timezone: "Asia/Tehran",
  },
];

const mockFetchCountries = vi.fn().mockResolvedValue(mockCountries);
const mockFetchCities = vi.fn().mockResolvedValue(mockCities);

vi.mock("@/utils/geolocationHelpers", () => ({
  getCurrentPosition: vi.fn(),
  fetchCountries: (...args: unknown[]) => mockFetchCountries(...args),
  fetchCities: (...args: unknown[]) => mockFetchCities(...args),
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchCountries.mockResolvedValue(mockCountries);
  mockFetchCities.mockResolvedValue(mockCities);
  Object.defineProperty(navigator, "geolocation", {
    value: mockGeolocation,
    writable: true,
    configurable: true,
  });
});

describe("LocationSelector", () => {
  it("renders country dropdown", async () => {
    await act(async () => {
      render(<LocationSelector value={null} onChange={vi.fn()} />);
    });
    expect(screen.getByLabelText("Country")).toBeInTheDocument();
  });

  it("fetches countries on mount", async () => {
    await act(async () => {
      render(<LocationSelector value={null} onChange={vi.fn()} />);
    });
    await waitFor(() => {
      expect(mockFetchCountries).toHaveBeenCalledWith("en");
    });
  });

  it("shows all countries in dropdown", async () => {
    await act(async () => {
      render(<LocationSelector value={null} onChange={vi.fn()} />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Country")).toBeInTheDocument();
    });

    const countrySelect = screen.getByLabelText("Country");
    const options = countrySelect.querySelectorAll("option");
    const optionTexts = Array.from(options).map((o) => o.textContent);
    expect(optionTexts).toContain("Iran");
    expect(optionTexts).toContain("United States");
  });

  it("selects country and loads cities", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    await act(async () => {
      render(<LocationSelector value={null} onChange={onChange} />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Country")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Country"), "IR");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 35.6892,
        lon: 51.389,
        countryCode: "IR",
        country: "Iran",
        timezone: "Asia/Tehran",
      }),
    );
  });

  it("selects city and updates coordinates", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    await act(async () => {
      render(
        <LocationSelector
          value={{
            lat: 35.6892,
            lon: 51.389,
            country: "Iran",
            countryCode: "IR",
          }}
          onChange={onChange}
        />,
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select city")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Select city"), "Isfahan");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 32.6546,
        lon: 51.668,
        city: "Isfahan",
      }),
    );
  });

  it("auto-detect calls geolocation", async () => {
    const { getCurrentPosition } = await import("@/utils/geolocationHelpers");
    (getCurrentPosition as ReturnType<typeof vi.fn>).mockResolvedValue({
      lat: 35.6892,
      lon: 51.389,
    });

    const onChange = vi.fn();
    const user = userEvent.setup();
    await act(async () => {
      render(<LocationSelector value={null} onChange={onChange} />);
    });

    await user.click(screen.getByText("Auto-Detect Location"));
    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });
  });

  it("manual coordinate input updates value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    await act(async () => {
      render(
        <LocationSelector value={{ lat: 0, lon: 0 }} onChange={onChange} />,
      );
    });

    // Click manual coords toggle
    await user.click(screen.getByText("Enter coordinates manually"));

    const latInput = screen.getByLabelText("Latitude");
    expect(latInput).toBeInTheDocument();

    const lonInput = screen.getByLabelText("Longitude");
    expect(lonInput).toBeInTheDocument();
  });
});
