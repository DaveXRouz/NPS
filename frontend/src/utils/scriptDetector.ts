/**
 * Detect script type in text for numerology system auto-selection.
 * Persian/Arabic Unicode range: U+0600 to U+06FF.
 */

export type ScriptType = "persian" | "latin" | "mixed" | "unknown";
export type NumerologySystem = "pythagorean" | "chaldean" | "abjad" | "auto";

const PERSIAN_ARABIC_RE = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_RE = /[A-Za-z]/;

export function containsPersian(text: string): boolean {
  return PERSIAN_ARABIC_RE.test(text);
}

export function containsLatin(text: string): boolean {
  return LATIN_RE.test(text);
}

export function detectScript(text: string): ScriptType {
  const hasPersian = containsPersian(text);
  const hasLatin = containsLatin(text);
  if (hasPersian && hasLatin) return "mixed";
  if (hasPersian) return "persian";
  if (hasLatin) return "latin";
  return "unknown";
}

export function autoSelectSystem(
  name: string,
  locale: string = "en",
  userPreference: NumerologySystem = "auto",
): Exclude<NumerologySystem, "auto"> {
  if (userPreference !== "auto") return userPreference;
  if (containsPersian(name)) return "abjad";
  if (locale.toLowerCase().startsWith("fa")) return "abjad";
  return "pythagorean";
}
