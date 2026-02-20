// Static numerology number meanings — bilingual (EN + FA)
// Mirrors backend LIFE_PATH_MEANINGS from framework_bridge.py

export interface NumberMeaning {
  title: string;
  keywords: string;
}

// Life Path uses richer "The ___" archetype titles
export const LIFE_PATH_MEANINGS: Record<
  number,
  { en: NumberMeaning; fa: NumberMeaning }
> = {
  1: {
    en: { title: "The Pioneer", keywords: "Lead, start, go first" },
    fa: { title: "پیشرو", keywords: "رهبری، شروع، پیشقدم شدن" },
  },
  2: {
    en: { title: "The Bridge", keywords: "Connect, harmonize, feel" },
    fa: { title: "پل", keywords: "اتصال، هماهنگی، احساس" },
  },
  3: {
    en: { title: "The Voice", keywords: "Create, express, beautify" },
    fa: { title: "صدا", keywords: "خلق، بیان، زیباسازی" },
  },
  4: {
    en: { title: "The Architect", keywords: "Build, structure, stabilize" },
    fa: { title: "معمار", keywords: "ساختن، نظم‌دهی، ثبات" },
  },
  5: {
    en: { title: "The Explorer", keywords: "Change, adapt, experience" },
    fa: { title: "کاشف", keywords: "تغییر، سازگاری، تجربه" },
  },
  6: {
    en: { title: "The Guardian", keywords: "Nurture, heal, protect" },
    fa: { title: "نگهبان", keywords: "پرورش، شفا، حمایت" },
  },
  7: {
    en: { title: "The Seeker", keywords: "Question, analyze, find meaning" },
    fa: { title: "جوینده", keywords: "پرسش، تحلیل، یافتن معنا" },
  },
  8: {
    en: { title: "The Powerhouse", keywords: "Master, achieve, build legacy" },
    fa: { title: "نیرومند", keywords: "تسلط، دستیابی، میراث‌سازی" },
  },
  9: {
    en: { title: "The Sage", keywords: "Complete, teach, transcend" },
    fa: { title: "حکیم", keywords: "تکمیل، آموزش، فراتر رفتن" },
  },
  11: {
    en: { title: "The Visionary", keywords: "See beyond, master intuition" },
    fa: { title: "آینده‌نگر", keywords: "فراتر دیدن، شهود" },
  },
  22: {
    en: {
      title: "The Master Builder",
      keywords: "Turn visions into reality",
    },
    fa: { title: "بنای استاد", keywords: "تبدیل رؤیا به واقعیت" },
  },
  33: {
    en: {
      title: "The Master Teacher",
      keywords: "Heal through compassionate leadership",
    },
    fa: { title: "معلم استاد", keywords: "شفا از طریق رهبری مهربانانه" },
  },
};

// General number meanings — shorter functional titles for Expression, Soul Urge, etc.
export const NUMBER_MEANINGS: Record<
  number,
  { en: NumberMeaning; fa: NumberMeaning }
> = {
  1: {
    en: { title: "Leader", keywords: "Independence, initiative, ambition" },
    fa: { title: "رهبر", keywords: "استقلال، ابتکار، بلندپروازی" },
  },
  2: {
    en: { title: "Diplomat", keywords: "Cooperation, sensitivity, balance" },
    fa: { title: "دیپلمات", keywords: "همکاری، حساسیت، تعادل" },
  },
  3: {
    en: { title: "Creator", keywords: "Expression, joy, imagination" },
    fa: { title: "خلاق", keywords: "بیان، شادی، تخیل" },
  },
  4: {
    en: { title: "Builder", keywords: "Discipline, stability, hard work" },
    fa: { title: "سازنده", keywords: "انضباط، ثبات، تلاش" },
  },
  5: {
    en: { title: "Adventurer", keywords: "Freedom, change, versatility" },
    fa: { title: "ماجراجو", keywords: "آزادی، تغییر، تطبیق‌پذیری" },
  },
  6: {
    en: { title: "Nurturer", keywords: "Responsibility, love, harmony" },
    fa: { title: "مراقب", keywords: "مسئولیت، عشق، هماهنگی" },
  },
  7: {
    en: { title: "Analyst", keywords: "Wisdom, introspection, truth" },
    fa: { title: "تحلیلگر", keywords: "خرد، درون‌نگری، حقیقت" },
  },
  8: {
    en: { title: "Achiever", keywords: "Power, abundance, authority" },
    fa: { title: "موفق", keywords: "قدرت، فراوانی، اقتدار" },
  },
  9: {
    en: {
      title: "Humanitarian",
      keywords: "Compassion, completion, wisdom",
    },
    fa: { title: "بشردوست", keywords: "شفقت، تکمیل، حکمت" },
  },
  11: {
    en: { title: "Intuitive", keywords: "Illumination, inspiration, vision" },
    fa: { title: "شهودی", keywords: "روشنایی، الهام، بینش" },
  },
  22: {
    en: {
      title: "Master Builder",
      keywords: "Large-scale vision, manifestation",
    },
    fa: { title: "بنای استاد", keywords: "چشم‌انداز بزرگ، تجلی" },
  },
  33: {
    en: {
      title: "Master Healer",
      keywords: "Selfless service, spiritual uplift",
    },
    fa: { title: "شفادهنده استاد", keywords: "خدمت بی‌دریغ، ارتقای معنوی" },
  },
};

export function getLifePathMeaning(
  number: number,
  locale: string,
): NumberMeaning | null {
  const entry = LIFE_PATH_MEANINGS[number];
  if (!entry) return null;
  return locale === "fa" ? entry.fa : entry.en;
}

export function getNumberMeaning(
  number: number,
  locale: string,
): NumberMeaning | null {
  const entry = NUMBER_MEANINGS[number];
  if (!entry) return null;
  return locale === "fa" ? entry.fa : entry.en;
}
