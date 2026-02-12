import { useTranslation } from "react-i18next";

const ABOUT_DATA = [
  { key: "about_app", value: "NPS — Numerology Puzzle Solver" },
  { key: "about_version", value: "4.0.0" },
  { key: "about_framework", value: "FC60 Numerology AI Framework v1.0.0" },
  { key: "about_author", value: "Dave (DaveXRouz)" },
  {
    key: "about_repo",
    value: "https://github.com/DaveXRouz/NPS",
    isLink: true,
  },
  {
    key: "about_credits",
    value: "React, FastAPI, PostgreSQL, Anthropic Claude API",
  },
] as const;

export function AboutSection() {
  const { t } = useTranslation();

  return (
    <dl className="space-y-2">
      {ABOUT_DATA.map((item) => (
        <div key={item.key} className="flex flex-col sm:flex-row sm:gap-4">
          <dt className="text-xs text-nps-text-dim min-w-[120px]">
            {t(`settings.${item.key}`)}
          </dt>
          <dd className="text-sm text-nps-text-bright">
            {"isLink" in item && item.isLink ? (
              <a
                href={item.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-nps-accent hover:underline"
              >
                {item.value}
              </a>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
