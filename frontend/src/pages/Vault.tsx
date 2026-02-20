import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FadeIn } from "@/components/common/FadeIn";
import { EmptyState } from "@/components/common/EmptyState";
import { vault } from "@/services/api";

export default function Vault() {
  const { t } = useTranslation();
  usePageTitle("vault.title");

  const {
    data: findings,
    isLoading: findingsLoading,
    isError: findingsError,
  } = useQuery({
    queryKey: ["vaultFindings"],
    queryFn: () => vault.findings({ limit: 100 }),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["vaultSummary"],
    queryFn: () => vault.summary(),
  });

  const isLoading = findingsLoading || summaryLoading;
  const totalFindings = summary?.total ?? findings?.length ?? 0;
  const sessionsCount = summary?.sessions ?? 0;
  const withBalance = summary?.with_balance ?? 0;

  return (
    <div className="flex flex-col gap-6" data-page="vault">
      {/* Page Header */}
      <FadeIn delay={0}>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-[var(--nps-text-bright)]">
            {t("vault.title")}
          </h2>
        </div>
      </FadeIn>

      {/* Summary Cards Row */}
      <FadeIn delay={80}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              labelKey: "vault.total_findings",
              value: isLoading ? "..." : String(totalFindings),
            },
            {
              labelKey: "vault.with_balance",
              value: isLoading ? "..." : String(withBalance),
            },
            {
              labelKey: "vault.sessions",
              value: isLoading ? "..." : String(sessionsCount),
            },
          ].map((card) => (
            <div
              key={card.labelKey}
              className="bg-[var(--nps-glass-bg)] backdrop-blur-[var(--nps-glass-blur-md)] border border-[var(--nps-glass-border)] rounded-xl p-4 hover:shadow-[0_0_12px_var(--nps-glass-glow)] transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-wider text-[var(--nps-text-dim)] mb-1">
                {t(card.labelKey, {
                  defaultValue: card.labelKey.split(".").pop(),
                })}
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
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-nps-bg-elevated rounded" />
              <div className="h-4 w-full bg-nps-bg-elevated rounded" />
              <div className="h-4 w-2/3 bg-nps-bg-elevated rounded" />
            </div>
          ) : findingsError ? (
            <EmptyState
              icon="vault"
              title={t("vault.error", {
                defaultValue: "Failed to load vault data",
              })}
              description={t("vault.error_desc", {
                defaultValue: "Please try again later.",
              })}
            />
          ) : !findings || findings.length === 0 ? (
            <EmptyState
              icon="vault"
              title={t("vault.empty")}
              description={t("vault.description")}
            />
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--nps-text-bright)] uppercase tracking-wider">
                {t("vault.recent_findings", {
                  defaultValue: "Recent Findings",
                })}
              </h3>
              <div className="divide-y divide-[var(--nps-glass-border)]">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm text-[var(--nps-text)] font-mono truncate"
                        title={finding.address}
                      >
                        {finding.address}
                      </p>
                      <p className="text-xs text-[var(--nps-text-dim)] mt-0.5">
                        {finding.chain}
                        {finding.source ? ` · ${finding.source}` : ""}
                        {finding.found_at
                          ? ` · ${new Date(finding.found_at).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-end shrink-0">
                      {finding.balance > 0 && (
                        <p className="text-sm font-semibold text-[var(--nps-accent)]">
                          {finding.balance.toFixed(8)}
                        </p>
                      )}
                      <p className="text-xs text-[var(--nps-text-dim)]">
                        {t("vault.score", { defaultValue: "Score" })}:{" "}
                        {finding.score.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
