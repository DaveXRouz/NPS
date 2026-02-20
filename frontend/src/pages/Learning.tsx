import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FadeIn } from "@/components/common/FadeIn";
import { EmptyState } from "@/components/common/EmptyState";

export default function Learning() {
  const { t } = useTranslation();
  usePageTitle("learning.title");

  return (
    <div className="flex flex-col gap-6" data-page="learning">
      {/* Page Header */}
      <FadeIn delay={0}>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--nps-text-bright)]">
            {t("learning.title")}
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--nps-accent)]/15 text-[var(--nps-accent)] border border-[var(--nps-accent)]/30 rounded-full">
            {t("layout.coming_soon", { defaultValue: "Coming Soon" })}
          </span>
        </div>
      </FadeIn>

      {/* Level Progress Card */}
      <FadeIn delay={80}>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-5 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
          <h3 className="text-sm font-semibold text-[var(--nps-accent)] mb-3">
            {t("learning.level_label", {
              level: 1,
              name: t("learning.level_novice"),
            })}
          </h3>
          <div className="h-2 bg-[var(--nps-bg-input,var(--nps-glass-bg))] rounded-full overflow-hidden border border-[var(--nps-glass-border-subtle,transparent)]">
            <div
              className="h-full bg-[var(--nps-accent)] rounded-full transition-all duration-500"
              style={{ width: "0%" }}
            />
          </div>
          <p className="text-xs text-[var(--nps-text-dim)] mt-2">
            {t("learning.xp_progress", { current: 0, max: 100 })}
          </p>
        </div>
      </FadeIn>

      {/* Stats Row */}
      <FadeIn delay={160}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { labelKey: "learning.insights", value: "0" },
            { labelKey: "learning.recommendations", value: "0" },
            { labelKey: "learning.xp", value: "0" },
          ].map((card) => (
            <div
              key={card.labelKey}
              className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-4 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-wider text-[var(--nps-text-dim)] mb-1">
                {t(card.labelKey)}
              </p>
              <p className="text-lg font-bold text-[var(--nps-text-bright)]">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Empty Content Area */}
      <FadeIn delay={240}>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-6 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
          <EmptyState icon="learning" title={t("learning.empty")} />
        </div>
      </FadeIn>
    </div>
  );
}
