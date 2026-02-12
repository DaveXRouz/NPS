import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StampComparison from "../StampComparison";
import type { FC60StampData } from "@/types";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "oracle.fc60_comparison_title": "Stamp Comparison",
        "oracle.fc60_shared_animals": "Shared animals",
        "oracle.fc60_shared_elements": "Shared elements",
        "oracle.fc60_animals_OX": "Ox",
        "oracle.fc60_animals_RA": "Rat",
        "oracle.fc60_elements_FI": "Fire",
        "oracle.fc60_elements_WU": "Wood",
        "oracle.fc60_copy": "Copy stamp",
        "oracle.fc60_half_am": "Morning",
        "oracle.fc60_half_pm": "Afternoon",
        "oracle.fc60_weekday": "Weekday",
        "oracle.fc60_month": "Month",
        "oracle.fc60_day": "Day",
        "oracle.fc60_hour": "Hour",
        "oracle.fc60_minute": "Minute",
        "oracle.fc60_second": "Second",
      };
      return translations[key] || opts?.defaultValue || key;
    },
    i18n: { language: "en" },
  }),
}));

const stamp1: FC60StampData = {
  fc60: "VE-OX-OXFI ☀OX-RUWU-RAWU",
  j60: "TIFI-DRMT-GOER-PIMT",
  y60: "HOMT-ROFI",
  chk: "TIMT",
  weekday: { token: "VE", name: "Venus", planet: "Venus", domain: "Love" },
  month: { token: "OX", animalName: "Ox", index: 2 },
  dom: { token: "OXFI", value: 6, animalName: "Ox", elementName: "Fire" },
  time: {
    half: "☀",
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

// Stamp2 shares OX animal with stamp1
const stamp2: FC60StampData = {
  fc60: "SA-OX-RAFI ☀RA-RAWU-RAWU",
  j60: "TIFI-DRWU-PIWA-OXWU",
  y60: "HOMT-DRWU",
  chk: "RAWU",
  weekday: {
    token: "SA",
    name: "Saturn",
    planet: "Saturn",
    domain: "Discipline",
  },
  month: { token: "OX", animalName: "Ox", index: 2 },
  dom: { token: "RAFI", value: 1, animalName: "Rat", elementName: "Fire" },
  time: {
    half: "☀",
    hour: { token: "RA", animalName: "Rat", value: 0 },
    minute: { token: "RAWU", value: 0, animalName: "Rat", elementName: "Wood" },
    second: { token: "RAWU", value: 0, animalName: "Rat", elementName: "Wood" },
  },
};

describe("StampComparison", () => {
  it("renders multiple stamps side by side", () => {
    render(
      <StampComparison
        stamps={[
          { userName: "Alice", stamp: stamp1 },
          { userName: "Bob", stamp: stamp2 },
        ]}
      />,
    );
    // Both stamps should render
    expect(screen.getByText("VE")).toBeInTheDocument();
    expect(screen.getByText("SA")).toBeInTheDocument();
  });

  it("shows user names as column headers", () => {
    render(
      <StampComparison
        stamps={[
          { userName: "Alice", stamp: stamp1 },
          { userName: "Bob", stamp: stamp2 },
        ]}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("highlights shared animals when enabled", () => {
    render(
      <StampComparison
        stamps={[
          { userName: "Alice", stamp: stamp1 },
          { userName: "Bob", stamp: stamp2 },
        ]}
        highlightShared={true}
      />,
    );
    // OX is shared between both stamps (month token)
    const sharedText = screen.getByText(/Shared animals/);
    expect(sharedText).toBeInTheDocument();
  });

  it("shows shared elements count", () => {
    render(
      <StampComparison
        stamps={[
          { userName: "Alice", stamp: stamp1 },
          { userName: "Bob", stamp: stamp2 },
        ]}
        highlightShared={true}
      />,
    );
    // FI (Fire) is shared in dom tokens, WU (Wood) in minute/second tokens
    const sharedEl = screen.getByText(/Shared elements/);
    expect(sharedEl).toBeInTheDocument();
  });
});
