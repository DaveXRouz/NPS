import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FC60StampDisplay from "../FC60StampDisplay";
import type { FC60StampData } from "@/types";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "oracle.fc60_copy": "Copy stamp",
        "oracle.fc60_copied": "Copied!",
        "oracle.fc60_half_am": "Morning",
        "oracle.fc60_half_pm": "Afternoon",
        "oracle.fc60_weekday": "Weekday",
        "oracle.fc60_month": "Month",
        "oracle.fc60_day": "Day",
        "oracle.fc60_hour": "Hour",
        "oracle.fc60_minute": "Minute",
        "oracle.fc60_second": "Second",
        "oracle.fc60_animals_OX": "Ox",
        "oracle.fc60_animals_RA": "Rat",
        "oracle.fc60_animals_RU": "Rabbit",
        "oracle.fc60_elements_FI": "Fire",
        "oracle.fc60_elements_WU": "Wood",
      };
      return translations[key] || opts?.defaultValue || key;
    },
    i18n: { language: "en" },
  }),
}));

const mockStampAM: FC60StampData = {
  fc60: "VE-OX-OXFI \u2600OX-RUWU-RAWU",
  j60: "TIFI-DRMT-GOER-PIMT",
  y60: "HOMT-ROFI",
  chk: "TIMT",
  weekday: {
    token: "VE",
    name: "Venus",
    planet: "Venus",
    domain: "Love, Beauty, Harmony",
  },
  month: { token: "OX", animalName: "Ox", index: 2 },
  dom: { token: "OXFI", value: 6, animalName: "Ox", elementName: "Fire" },
  time: {
    half: "\u2600",
    half_type: "day",
    hour: { token: "OX", animalName: "Ox", value: 1 },
    minute: {
      token: "RUWU",
      value: 15,
      animalName: "Rabbit",
      elementName: "Wood",
    },
    second: { token: "RAWU", value: 0, animalName: "Rat", elementName: "Wood" },
  },
};

const mockStampPM: FC60StampData = {
  ...mockStampAM,
  fc60: "JO-OX-SNWA \uD83C\uDF19RA-RAWU-RAWU",
  time: {
    half: "\uD83C\uDF19",
    half_type: "night",
    hour: { token: "RA", animalName: "Rat", value: 12 },
    minute: { token: "RAWU", value: 0, animalName: "Rat", elementName: "Wood" },
    second: { token: "RAWU", value: 0, animalName: "Rat", elementName: "Wood" },
  },
};

describe("FC60StampDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders full FC60 stamp string", () => {
    render(<FC60StampDisplay stamp={mockStampAM} />);
    // The stamp tokens should be visible
    expect(screen.getByText("VE")).toBeInTheDocument();
    expect(screen.getByText("OXFI")).toBeInTheDocument();
    expect(screen.getByText("RUWU")).toBeInTheDocument();
  });

  it("applies correct element color for Fire token", () => {
    render(<FC60StampDisplay stamp={mockStampAM} />);
    const fireToken = screen.getByText("OXFI");
    expect(fireToken.getAttribute("data-element")).toBe("FI");
    expect(fireToken.className).toContain("text-[var(--nps-element-fire)]");
  });

  it("applies correct element color for Wood token", () => {
    render(<FC60StampDisplay stamp={mockStampAM} />);
    const woodToken = screen.getByText("RUWU");
    expect(woodToken.getAttribute("data-element")).toBe("WU");
    expect(woodToken.className).toContain("text-[var(--nps-element-wood)]");
  });

  it("applies correct element color for Water token", () => {
    const waterStamp: FC60StampData = {
      ...mockStampAM,
      dom: {
        token: "PIWA",
        value: 59,
        animalName: "Pig",
        elementName: "Water",
      },
    };
    render(<FC60StampDisplay stamp={waterStamp} />);
    const waterToken = screen.getByText("PIWA");
    expect(waterToken.getAttribute("data-element")).toBe("WA");
    expect(waterToken.className).toContain("text-[var(--nps-element-water)]");
  });

  it("applies correct element color for Metal token", () => {
    const metalStamp: FC60StampData = {
      ...mockStampAM,
      dom: {
        token: "TIMT",
        value: 13,
        animalName: "Tiger",
        elementName: "Metal",
      },
    };
    render(<FC60StampDisplay stamp={metalStamp} />);
    const metalToken = screen.getByText("TIMT");
    expect(metalToken.getAttribute("data-element")).toBe("MT");
    expect(metalToken.className).toContain("text-[var(--nps-element-metal)]");
  });

  it("applies correct element color for Earth token", () => {
    const earthStamp: FC60StampData = {
      ...mockStampAM,
      dom: {
        token: "DRER",
        value: 22,
        animalName: "Dragon",
        elementName: "Earth",
      },
    };
    render(<FC60StampDisplay stamp={earthStamp} />);
    const earthToken = screen.getByText("DRER");
    expect(earthToken.getAttribute("data-element")).toBe("ER");
    expect(earthToken.className).toContain("text-[var(--nps-element-earth)]");
  });

  it("shows Sun icon for AM (day) half", () => {
    render(<FC60StampDisplay stamp={mockStampAM} />);
    // Sun icon should render with yellow color class
    const halfContainer = screen.getByTitle("Morning");
    expect(halfContainer.className).toContain("text-yellow-400");
  });

  it("shows Moon icon for PM (night) half", () => {
    render(<FC60StampDisplay stamp={mockStampPM} />);
    const halfContainer = screen.getByTitle("Afternoon");
    expect(halfContainer.className).toContain("text-blue-300");
  });

  it("shows tooltips with animal names on hover", () => {
    render(<FC60StampDisplay stamp={mockStampAM} showTooltips={true} />);
    const domToken = screen.getByText("OXFI");
    expect(domToken.getAttribute("title")).toContain("Ox");
    expect(domToken.getAttribute("title")).toContain("Fire");
  });

  it("copy button copies stamp to clipboard", async () => {
    const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<FC60StampDisplay stamp={mockStampAM} showCopyButton={true} />);
    const copyBtn = screen.getByLabelText("Copy stamp");
    fireEvent.click(copyBtn);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      "VE-OX-OXFI \u2600OX-RUWU-RAWU",
    );
  });

  it("renders compact size variant", () => {
    render(<FC60StampDisplay stamp={mockStampAM} size="compact" />);
    const container = screen.getByLabelText(/FC60 stamp/);
    expect(container.getAttribute("data-size")).toBe("compact");
    expect(container.className).toContain("text-xs");
  });

  it("renders large size variant", () => {
    render(<FC60StampDisplay stamp={mockStampAM} size="large" />);
    const container = screen.getByLabelText(/FC60 stamp/);
    expect(container.getAttribute("data-size")).toBe("large");
    expect(container.className).toContain("text-lg");
  });

  it("has proper aria-label for accessibility", () => {
    render(<FC60StampDisplay stamp={mockStampAM} />);
    const container = screen.getByLabelText(
      "FC60 stamp: VE-OX-OXFI \u2600OX-RUWU-RAWU",
    );
    expect(container).toBeInTheDocument();
  });
});
