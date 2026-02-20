import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FadeIn } from "@/components/common/FadeIn";
import { EmptyState } from "@/components/common/EmptyState";

export default function Vault() {
  const { t } = useTranslation();
  usePageTitle("vault.title");

  return (
    <div className="flex flex-col gap-6" data-page="vault">
      {/* Page Header */}
      <FadeIn delay={0}>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[var(--nps-text-bright)]">
            {t("vault.title")}
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--nps-accent)]/15 text-[var(--nps-accent)] border border-[var(--nps-accent)]/30 rounded-full">
            {t("layout.coming_soon", { defaultValue: "Coming Soon" })}
          </span>
        </div>
      </FadeIn>

      {/* Summary Cards Row */}
      <FadeIn delay={80}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { labelKey: "vault.total_findings", value: "0" },
            { labelKey: "vault.export", value: "--" },
            { labelKey: "vault.summary", value: "--" },
          ].map((card) => (
            <div
              key={card.labelKey}
              className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300"
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

      {/* Main Content Area */}
      <FadeIn delay={160}>
        <div className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-6 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300">
          <EmptyState
            icon="vault"
            title={t("vault.empty")}
            description={t("vault.description")}
          />
        </div>
      </FadeIn>
    </div>
  );
}
