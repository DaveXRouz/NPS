import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "../locales/en.json";
import fa from "../locales/fa.json";
import { toPersianNumber, formatPersianDate } from "../utils/persianFormatter";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fa: { translation: fa },
    },
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "nps_language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
      format: (
        value: string,
        format: string | undefined,
        lng: string | undefined,
      ) => {
        if (format === "number" && lng === "fa") {
          return toPersianNumber(Number(value));
        }
        if (format === "date" && lng === "fa") {
          return formatPersianDate(String(value));
        }
        return String(value);
      },
    },
  });

i18n.on("languageChanged", (lng: string) => {
  document.documentElement.dir = lng === "fa" ? "rtl" : "ltr";
  document.documentElement.lang = lng;
});

export default i18n;
