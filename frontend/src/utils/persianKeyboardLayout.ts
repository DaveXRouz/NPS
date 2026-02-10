/** Persian QWERTY keyboard layout — base rows (no shift) */
export const PERSIAN_ROWS: string[][] = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "چ"],
  ["ش", "س", "ی", "ب", "ل", "ا", "ت", "ن", "م", "ک", "گ"],
  ["ظ", "ط", "ز", "ر", "ذ", "د", "پ", "و"],
  ["ژ", "ء", "آ", "ئ", "ؤ", "ة", "ي"],
];

/** Persian QWERTY keyboard layout — shift rows (numbers, diacritics, punctuation) */
export const PERSIAN_SHIFT_ROWS: string[][] = [
  ["۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹", "۰", "ـ", "×"],
  ["ٌ", "ٍ", "ً", "َ", "ُ", "ِ", "ّ", "؛", ":", "»", "«"],
  ["ٰ", "ٓ", "ٔ", "،", ".", "؟", "!", "(", ")"],
  ["-", "+", "=", "/", "\\", "@", "#"],
];
