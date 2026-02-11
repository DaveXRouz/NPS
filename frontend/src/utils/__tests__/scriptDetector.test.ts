import { describe, it, expect } from "vitest";
import {
  detectScript,
  containsPersian,
  containsLatin,
  autoSelectSystem,
} from "../scriptDetector";

describe("detectScript", () => {
  it("detects persian text", () => {
    expect(detectScript("\u0639\u0644\u06cc")).toBe("persian");
  });

  it("detects latin text", () => {
    expect(detectScript("Alice")).toBe("latin");
  });

  it("detects mixed text", () => {
    expect(detectScript("Ali \u0639\u0644\u06cc")).toBe("mixed");
  });

  it("returns unknown for digits only", () => {
    expect(detectScript("12345")).toBe("unknown");
  });
});

describe("containsPersian", () => {
  it("returns true for Persian text", () => {
    expect(containsPersian("\u0633\u0644\u0627\u0645")).toBe(true);
  });

  it("returns false for English text", () => {
    expect(containsPersian("Hello")).toBe(false);
  });
});

describe("containsLatin", () => {
  it("returns true for English text", () => {
    expect(containsLatin("Hello")).toBe(true);
  });

  it("returns false for Persian text", () => {
    expect(containsLatin("\u0633\u0644\u0627\u0645")).toBe(false);
  });
});

describe("autoSelectSystem", () => {
  it("selects abjad for Persian name", () => {
    expect(autoSelectSystem("\u0639\u0644\u06cc")).toBe("abjad");
  });

  it("selects pythagorean for English name", () => {
    expect(autoSelectSystem("Alice")).toBe("pythagorean");
  });

  it("selects abjad for fa locale", () => {
    expect(autoSelectSystem("Alice", "fa")).toBe("abjad");
  });

  it("respects manual override", () => {
    expect(autoSelectSystem("Alice", "en", "chaldean")).toBe("chaldean");
  });
});
