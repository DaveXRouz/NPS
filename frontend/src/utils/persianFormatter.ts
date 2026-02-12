import { isoToJalaali } from "./dateFormatters";

const PERSIAN_DIGITS = [
  "\u06F0",
  "\u06F1",
  "\u06F2",
  "\u06F3",
  "\u06F4",
  "\u06F5",
  "\u06F6",
  "\u06F7",
  "\u06F8",
  "\u06F9",
];

/** Convert Latin digits (0-9) in a string to Persian digits (\u06F0-\u06F9). */
export function toPersianDigits(str: string): string {
  if (!str) return "";
  return str.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Convert a number to a string with Persian digits. */
export function toPersianNumber(n: number): string {
  return toPersianDigits(String(n));
}

/** Format an ISO date (YYYY-MM-DD) as a Jalaali date string with Persian digits. */
export function formatPersianDate(iso: string): string {
  if (!iso) return "";
  const { jy, jm, jd } = isoToJalaali(iso);
  const formatted = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
  return toPersianDigits(formatted);
}

/** Format number with Persian grouping separator (\u066C). */
export function formatPersianGrouped(n: number): string {
  const parts = n.toString().split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u066C");
  const result = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  return toPersianDigits(result);
}

/** Persian ordinal: 1 \u2192 "\u0627\u0648\u0644", 2 \u2192 "\u062F\u0648\u0645", n \u2192 "n\u0645". */
export function toPersianOrdinal(n: number): string {
  const ordinals: Record<number, string> = {
    1: "\u0627\u0648\u0644",
    2: "\u062F\u0648\u0645",
    3: "\u0633\u0648\u0645",
    4: "\u0686\u0647\u0627\u0631\u0645",
    5: "\u067E\u0646\u062C\u0645",
    6: "\u0634\u0634\u0645",
    7: "\u0647\u0641\u062A\u0645",
    8: "\u0647\u0634\u062A\u0645",
    9: "\u0646\u0647\u0645",
    10: "\u062F\u0647\u0645",
  };
  if (ordinals[n]) return ordinals[n];
  return `${toPersianNumber(n)}\u0645`;
}
