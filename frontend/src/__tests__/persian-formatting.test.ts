import {
  toPersianDigits,
  toPersianNumber,
  formatPersianDate,
  formatPersianGrouped,
  toPersianOrdinal,
} from "../utils/persianFormatter";

describe("Persian formatting", () => {
  describe("toPersianDigits", () => {
    test("converts all digits", () => {
      expect(toPersianDigits("0123456789")).toBe(
        "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9",
      );
    });
    test("preserves non-digit characters", () => {
      expect(toPersianDigits("abc")).toBe("abc");
    });
    test("handles mixed content", () => {
      expect(toPersianDigits("Score: 42")).toBe("Score: \u06F4\u06F2");
    });
    test("handles empty string", () => {
      expect(toPersianDigits("")).toBe("");
    });
  });

  describe("toPersianNumber", () => {
    test("converts integer", () => {
      expect(toPersianNumber(42)).toBe("\u06F4\u06F2");
    });
    test("converts zero", () => {
      expect(toPersianNumber(0)).toBe("\u06F0");
    });
    test("converts large number", () => {
      expect(toPersianNumber(1234)).toBe("\u06F1\u06F2\u06F3\u06F4");
    });
  });

  describe("formatPersianGrouped", () => {
    test("adds grouping separator", () => {
      expect(formatPersianGrouped(1234567)).toBe(
        "\u06F1\u066C\u06F2\u06F3\u06F4\u066C\u06F5\u06F6\u06F7",
      );
    });
    test("no separator for small numbers", () => {
      expect(formatPersianGrouped(999)).toBe("\u06F9\u06F9\u06F9");
    });
    test("handles zero", () => {
      expect(formatPersianGrouped(0)).toBe("\u06F0");
    });
  });

  describe("toPersianOrdinal", () => {
    test("first \u2192 \u0627\u0648\u0644", () => {
      expect(toPersianOrdinal(1)).toBe("\u0627\u0648\u0644");
    });
    test("second \u2192 \u062F\u0648\u0645", () => {
      expect(toPersianOrdinal(2)).toBe("\u062F\u0648\u0645");
    });
    test("tenth \u2192 \u062F\u0647\u0645", () => {
      expect(toPersianOrdinal(10)).toBe("\u062F\u0647\u0645");
    });
    test("eleventh \u2192 generic pattern", () => {
      expect(toPersianOrdinal(11)).toBe("\u06F1\u06F1\u0645");
    });
  });

  describe("formatPersianDate", () => {
    test("converts ISO date to Jalali", () => {
      const result = formatPersianDate("2024-03-20");
      // 2024-03-20 = 1403/01/01 (Nowruz)
      expect(result).toContain("\u06F1\u06F4\u06F0\u06F3");
    });
    test("handles empty string", () => {
      expect(formatPersianDate("")).toBe("");
    });
  });
});
