import { useTranslation } from "react-i18next";
import {
  Globe,
  Hash,
  Clock,
  Link2,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  Type,
} from "lucide-react";
import { TranslatedReading } from "./TranslatedReading";
import { ReadingSection } from "./ReadingSection";
import { NumerologyNumberDisplay } from "./NumerologyNumberDisplay";
import { PatternBadge } from "./PatternBadge";
import { ReadingHeader } from "./ReadingHeader";
import { ReadingFooter } from "./ReadingFooter";
import { EmptyState } from "@/components/common/EmptyState";
import { FadeIn } from "@/components/common/FadeIn";
import { StaggerChildren } from "@/components/common/StaggerChildren";
import { MoonPhaseIcon } from "@/components/common/icons";
import { useInView } from "@/hooks/useInView";
import type { ConsultationResult } from "@/types";

function ScrollRevealNumber({
  children,
  delay = "",
}: {
  children: React.ReactNode;
  delay?: string;
}) {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });
  return (
    <div
      ref={ref}
      className={`bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3 ${inView ? `nps-animate-number-reveal ${delay}` : "opacity-0"}`}
    >
      {children}
    </div>
  );
}

interface SummaryTabProps {
  result: ConsultationResult | null;
}

function ReadingSummary({
  result,
}: {
  result: Extract<ConsultationResult, { type: "reading" }>;
}) {
  const { t } = useTranslation();
  const { data } = result;

  // Detect element balance warnings: any element at 0 or dominant >3
  const balanceWarnings: string[] = [];
  if (data.fc60?.element_balance) {
    for (const [el, val] of Object.entries(data.fc60.element_balance)) {
      if (val === 0)
        balanceWarnings.push(`${el}: ${t("oracle.caution_missing")}`);
      if (val > 3)
        balanceWarnings.push(`${el}: ${t("oracle.caution_dominant")}`);
    }
  }

  return (
    <StaggerChildren staggerMs={60}>
      {/* Section 1: Header */}
      <ReadingHeader
        userName={t("oracle.current_reading")}
        readingDate={data.generated_at}
        readingType="reading"
        confidence={data.fc60 ? data.fc60.energy_level / 10 : undefined}
      />

      {/* Section 2: Universal Address */}
      {data.fc60_extended && (
        <ReadingSection
          title={t("oracle.section_universal_address")}
          icon={<Globe size={16} />}
        >
          <div className="space-y-2 pt-2">
            <p className="font-mono text-sm text-nps-text-bright">
              {data.fc60_extended.stamp}
            </p>
            <div className="flex gap-4 text-xs text-nps-text-dim flex-wrap">
              <span>
                {data.fc60_extended.weekday_name} &middot;{" "}
                {data.fc60_extended.weekday_planet}
              </span>
              <span>{data.fc60_extended.weekday_domain}</span>
            </div>
          </div>
        </ReadingSection>
      )}

      {/* Section 3: Core Identity */}
      {data.numerology && (
        <ReadingSection
          title={t("oracle.section_core_identity")}
          icon={<Hash size={16} />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <ScrollRevealNumber>
              <NumerologyNumberDisplay
                number={data.numerology.life_path}
                label={t("oracle.life_path")}
                meaning={data.numerology.interpretation || ""}
                size="md"
              />
            </ScrollRevealNumber>
            <ScrollRevealNumber delay="nps-delay-1">
              <NumerologyNumberDisplay
                number={data.numerology.day_vibration}
                label={t("oracle.day_vibration")}
                meaning=""
                size="sm"
              />
            </ScrollRevealNumber>
            <ScrollRevealNumber delay="nps-delay-2">
              <NumerologyNumberDisplay
                number={data.numerology.personal_year}
                label={t("oracle.personal_year")}
                meaning=""
                size="sm"
              />
            </ScrollRevealNumber>
          </div>
        </ReadingSection>
      )}

      {/* Section 4: Right Now */}
      {(data.fc60 || data.moon || data.ganzhi) && (
        <ReadingSection
          title={t("oracle.section_right_now")}
          icon={<Clock size={16} />}
        >
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            {data.fc60 && (
              <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3">
                <span className="text-xs text-[var(--nps-text-dim)]">
                  {t("oracle.element")}
                </span>
                <p className="text-[var(--nps-text-bright)] font-medium">
                  {data.fc60.element}
                </p>
              </div>
            )}
            {data.fc60 && (
              <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3">
                <span className="text-xs text-[var(--nps-text-dim)]">
                  {t("oracle.energy")}
                </span>
                <p className="text-[var(--nps-text-bright)] font-medium">
                  {data.fc60.energy_level}
                </p>
              </div>
            )}
            {data.moon && (
              <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3">
                <span className="text-xs text-[var(--nps-text-dim)]">
                  {t("oracle.details_moon_phase")}
                </span>
                <p className="text-[var(--nps-text)] flex items-center gap-1.5">
                  <MoonPhaseIcon phaseName={data.moon.phase_name} size={16} />
                  {data.moon.phase_name} ({data.moon.illumination}%)
                </p>
              </div>
            )}
            {data.ganzhi && (
              <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3">
                <span className="text-xs text-[var(--nps-text-dim)]">
                  {t("oracle.details_chinese_cosmology")}
                </span>
                <p className="text-[var(--nps-text)]">
                  {data.ganzhi.year_animal} &middot; {data.ganzhi.stem_element}
                </p>
              </div>
            )}
          </div>
        </ReadingSection>
      )}

      {/* Section 5: Patterns */}
      <ReadingSection
        title={t("oracle.section_patterns")}
        icon={<Link2 size={16} />}
      >
        <div className="flex gap-2 flex-wrap pt-2">
          {data.synchronicities && data.synchronicities.length > 0 ? (
            data.synchronicities.map((s, i) => (
              <PatternBadge key={i} pattern={s} priority="medium" />
            ))
          ) : (
            <p className="text-xs text-nps-text-dim">
              {t("oracle.no_patterns")}
            </p>
          )}
          {data.angel &&
            data.angel.matches.length > 0 &&
            data.angel.matches.map((m, i) => (
              <PatternBadge
                key={`angel-${i}`}
                pattern={String(m.number)}
                priority="high"
                description={m.meaning}
              />
            ))}
        </div>
      </ReadingSection>

      {/* Section 6: The Message (AI Interpretation) */}
      {data.ai_interpretation && (
        <ReadingSection
          title={t("oracle.section_message")}
          icon={<Sparkles size={16} />}
        >
          <FadeIn delay={300}>
            <div className="pt-2 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4 border-s-2 border-s-[var(--nps-accent)]">
              <TranslatedReading reading={data.ai_interpretation} />
            </div>
          </FadeIn>
        </ReadingSection>
      )}

      {/* Section 7: Today's Advice */}
      <ReadingSection
        title={t("oracle.section_advice")}
        icon={<Lightbulb size={16} />}
      >
        <div className="pt-2 border-s-2 border-nps-oracle-accent/30 ps-3">
          <TranslatedReading reading={data.summary} />
        </div>
      </ReadingSection>

      {/* Section 8: Caution (only if warnings) */}
      {balanceWarnings.length > 0 && (
        <ReadingSection
          title={t("oracle.section_caution")}
          icon={<AlertTriangle size={16} />}
          priority="high"
        >
          <div className="pt-2 space-y-1">
            {balanceWarnings.map((w, i) => (
              <p key={i} className="text-xs text-nps-warning">
                {w}
              </p>
            ))}
          </div>
        </ReadingSection>
      )}

      {/* Section 9: Footer */}
      <ReadingFooter
        confidence={data.fc60 ? data.fc60.energy_level / 10 : 0.5}
        generatedAt={data.generated_at}
      />
    </StaggerChildren>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  love: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  career: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  health: "bg-green-500/20 text-green-400 border-green-500/30",
  finance: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  family: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  spiritual: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  general:
    "bg-[var(--nps-accent)]/20 text-[var(--nps-accent)] border-[var(--nps-accent)]/30",
};

function QuestionSummary({
  result,
}: {
  result: Extract<ConsultationResult, { type: "question" }>;
}) {
  const { t } = useTranslation();
  const { data } = result;

  const fc60Stamp =
    data.fc60_stamp && typeof data.fc60_stamp === "object"
      ? (data.fc60_stamp as Record<string, string>)
      : null;

  const moonData =
    data.moon && typeof data.moon === "object"
      ? (data.moon as Record<string, unknown>)
      : null;

  const ganzhiData =
    data.ganzhi && typeof data.ganzhi === "object"
      ? (data.ganzhi as Record<string, unknown>)
      : null;

  const patternsData =
    data.patterns && typeof data.patterns === "object"
      ? (data.patterns as {
          detected?: { type: string; strength: string; message?: string }[];
          count?: number;
        })
      : null;

  return (
    <StaggerChildren staggerMs={60}>
      <ReadingHeader
        userName={data.question}
        readingDate={new Date().toISOString()}
        readingType="question"
        confidence={data.confidence ? data.confidence.score / 100 : undefined}
      />

      {/* Category badge */}
      {data.category && (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${CATEGORY_COLORS[data.category] || CATEGORY_COLORS.general}`}
          >
            {t(`oracle.category_${data.category}`, data.category)}
          </span>
        </div>
      )}

      <ReadingSection
        title={t("oracle.section_core_identity")}
        icon={<HelpCircle size={16} />}
      >
        <div className="pt-2 space-y-2">
          <NumerologyNumberDisplay
            number={data.question_number}
            label={t("oracle.question_number_label")}
            meaning={data.numerology_system}
            size="md"
          />
          <div className="flex gap-4 text-xs text-nps-text-dim">
            <span>
              {t("oracle.detected_script", { script: data.detected_script })}
            </span>
            {data.is_master_number && (
              <span className="text-nps-score-peak">
                {t("oracle.master_number_badge")}
              </span>
            )}
          </div>
        </div>
      </ReadingSection>

      {/* FC60 Stamp */}
      {fc60Stamp && fc60Stamp.fc60 && (
        <ReadingSection
          title={t("oracle.section_universal_address")}
          icon={<Globe size={16} />}
        >
          <div className="space-y-2 pt-2">
            <p className="font-mono text-sm text-nps-text-bright">
              {fc60Stamp.fc60}
            </p>
            {fc60Stamp.j60 && (
              <p className="text-xs text-nps-text-dim">J60: {fc60Stamp.j60}</p>
            )}
          </div>
        </ReadingSection>
      )}

      {/* Moon + Ganzhi */}
      {(moonData || ganzhiData) && (
        <ReadingSection
          title={t("oracle.section_right_now")}
          icon={<Clock size={16} />}
        >
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            {moonData && moonData.phase_name && (
              <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3">
                <span className="text-xs text-[var(--nps-text-dim)]">
                  {t("oracle.details_moon_phase")}
                </span>
                <p className="text-[var(--nps-text)] flex items-center gap-1.5">
                  <MoonPhaseIcon
                    phaseName={String(moonData.phase_name)}
                    size={16}
                  />
                  {String(moonData.phase_name)}{" "}
                  {moonData.illumination != null &&
                    `(${moonData.illumination}%)`}
                </p>
              </div>
            )}
            {ganzhiData && (
              <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-3">
                <span className="text-xs text-[var(--nps-text-dim)]">
                  {t("oracle.details_chinese_cosmology")}
                </span>
                <p className="text-[var(--nps-text)]">
                  {ganzhiData.year
                    ? `${(ganzhiData.year as Record<string, string>).animal_name || ""} \u00b7 ${(ganzhiData.year as Record<string, string>).element || ""}`
                    : `${ganzhiData.year_animal || ""} \u00b7 ${ganzhiData.stem_element || ""}`}
                </p>
              </div>
            )}
          </div>
        </ReadingSection>
      )}

      {/* Patterns */}
      {patternsData &&
        patternsData.detected &&
        patternsData.detected.length > 0 && (
          <ReadingSection
            title={t("oracle.section_patterns")}
            icon={<Link2 size={16} />}
          >
            <div className="flex gap-2 flex-wrap pt-2">
              {patternsData.detected.map((p, i) => (
                <PatternBadge
                  key={i}
                  pattern={p.type}
                  priority={
                    p.strength === "high" || p.strength === "very_high"
                      ? "high"
                      : "medium"
                  }
                  description={p.message}
                />
              ))}
            </div>
          </ReadingSection>
        )}

      {data.ai_interpretation && (
        <ReadingSection
          title={t("oracle.section_message")}
          icon={<Sparkles size={16} />}
        >
          <FadeIn delay={300}>
            <div className="pt-2 bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg p-4 border-s-2 border-s-[var(--nps-accent)]">
              <TranslatedReading reading={data.ai_interpretation} />
            </div>
          </FadeIn>
        </ReadingSection>
      )}

      {data.confidence && (
        <ReadingFooter confidence={data.confidence.score / 100} />
      )}
    </StaggerChildren>
  );
}

function NameSummary({
  result,
}: {
  result: Extract<ConsultationResult, { type: "name" }>;
}) {
  const { t } = useTranslation();
  const { data } = result;

  return (
    <div className="space-y-4">
      <ReadingHeader
        userName={data.name}
        readingDate={new Date().toISOString()}
        readingType="name"
        confidence={data.confidence ? data.confidence.score / 100 : undefined}
      />

      <ReadingSection
        title={t("oracle.section_core_identity")}
        icon={<Hash size={16} />}
      >
        <div className="grid grid-cols-3 gap-3 pt-2">
          <ScrollRevealNumber>
            <NumerologyNumberDisplay
              number={data.expression}
              label={t("oracle.expression")}
              meaning=""
              size="md"
            />
          </ScrollRevealNumber>
          <ScrollRevealNumber delay="nps-delay-1">
            <NumerologyNumberDisplay
              number={data.soul_urge}
              label={t("oracle.soul_urge")}
              meaning=""
              size="md"
            />
          </ScrollRevealNumber>
          <ScrollRevealNumber delay="nps-delay-2">
            <NumerologyNumberDisplay
              number={data.personality}
              label={t("oracle.personality")}
              meaning=""
              size="md"
            />
          </ScrollRevealNumber>
        </div>
      </ReadingSection>

      {data.letter_breakdown && data.letter_breakdown.length > 0 && (
        <ReadingSection
          title={t("oracle.details_letters")}
          icon={<Type size={16} />}
        >
          <div className="bg-[var(--nps-glass-bg)] backdrop-blur-sm border border-[var(--nps-glass-border)] rounded-lg overflow-hidden mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--nps-text-dim)] border-b border-[var(--nps-border)]">
                  <th className="text-start py-2 px-3">
                    {t("oracle.letter_column")}
                  </th>
                  <th className="text-end py-2 px-3">
                    {t("oracle.details_value")}
                  </th>
                  <th className="text-end py-2 px-3">{t("oracle.element")}</th>
                </tr>
              </thead>
              <tbody>
                {data.letter_breakdown.map((l, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--nps-border)]/30 last:border-0"
                  >
                    <td className="py-1.5 px-3 text-[var(--nps-text-bright)]">
                      {l.letter}
                    </td>
                    <td className="py-1.5 px-3 text-end text-[var(--nps-text)]">
                      {l.value}
                    </td>
                    <td className="py-1.5 px-3 text-end text-[var(--nps-text)]">
                      {l.element}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReadingSection>
      )}

      {data.ai_interpretation && (
        <ReadingSection
          title={t("oracle.section_message")}
          icon={<Sparkles size={16} />}
        >
          <div className="pt-2">
            <TranslatedReading reading={data.ai_interpretation} />
          </div>
        </ReadingSection>
      )}

      {data.confidence && (
        <ReadingFooter confidence={data.confidence.score / 100} />
      )}
    </div>
  );
}

export function SummaryTab({ result }: SummaryTabProps) {
  const { t } = useTranslation();

  if (!result) {
    return (
      <EmptyState icon="readings" title={t("oracle.results_placeholder")} />
    );
  }

  if (result.type === "reading") {
    return <ReadingSummary result={result} />;
  }
  if (result.type === "question") {
    return <QuestionSummary result={result} />;
  }
  return <NameSummary result={result} />;
}
