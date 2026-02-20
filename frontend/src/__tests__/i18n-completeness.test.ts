import en from "../locales/en.json";
import fa from "../locales/fa.json";

function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      return getAllKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

describe("i18n completeness", () => {
  const enKeys = getAllKeys(en);
  const faKeys = getAllKeys(fa);

  test("en.json and fa.json have identical key structures", () => {
    const enSet = new Set(enKeys);
    const faSet = new Set(faKeys);
    const missingInFa = enKeys.filter((k) => !faSet.has(k));
    const missingInEn = faKeys.filter((k) => !enSet.has(k));
    expect(missingInFa).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  test("no empty translation values in en.json", () => {
    const empty = enKeys.filter((k) => {
      const parts = k.split(".");
      let val: unknown = en;
      for (const p of parts) val = (val as Record<string, unknown>)[p];
      return val === "" || val === null || val === undefined;
    });
    expect(empty).toEqual([]);
  });

  test("no empty translation values in fa.json", () => {
    const empty = faKeys.filter((k) => {
      const parts = k.split(".");
      let val: unknown = fa;
      for (const p of parts) val = (val as Record<string, unknown>)[p];
      return val === "" || val === null || val === undefined;
    });
    expect(empty).toEqual([]);
  });

  test("en.json has minimum expected sections", () => {
    const sections = Object.keys(en);
    expect(sections).toContain("nav");
    expect(sections).toContain("dashboard");
    expect(sections).toContain("settings");
    expect(sections).toContain("oracle");
    expect(sections).toContain("vault");
    expect(sections).toContain("learning");
    expect(sections).toContain("feedback");
    expect(sections).toContain("validation");
    expect(sections).toContain("common");
    expect(sections).toContain("accessibility");
  });

  test("translation count is above minimum threshold", () => {
    expect(enKeys.length).toBeGreaterThan(150);
    expect(faKeys.length).toBeGreaterThan(150);
  });
});
