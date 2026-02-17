import { useState } from "react";
import { useTranslation } from "react-i18next";
import CompatibilityMeter from "./CompatibilityMeter";
import type {
  MultiUserFrameworkResponse,
  PairwiseCompatibilityResult,
  FrameworkReadingResponse,
} from "@/types";

interface MultiUserReadingDisplayProps {
  result: MultiUserFrameworkResponse;
  onClose?: () => void;
}

function getCellColor(score: number): string {
  if (score >= 70) return "bg-nps-success/15 text-nps-success";
  if (score >= 40) return "bg-nps-warning/15 text-nps-warning";
  return "bg-nps-error/15 text-nps-error";
}

export default function MultiUserReadingDisplay({
  result,
  onClose,
}: MultiUserReadingDisplayProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "fa";
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPair, setSelectedPair] =
    useState<PairwiseCompatibilityResult | null>(null);

  const userNames = result.individual_readings.map(
    (r: FrameworkReadingResponse) => r.sign_value,
  );

  return (
    <div
      className={`rounded-xl border border-nps-border bg-nps-bg-card shadow-sm ${isRTL ? "rtl" : ""}`}
      data-testid="multi-user-display"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-nps-border">
        <h3 className="text-lg font-semibold text-nps-text-bright">
          {t("oracle.multi_user_title")}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-nps-text-dim hover:text-nps-text"
            aria-label={t("common.close")}
          >
            &times;
          </button>
        )}
      </div>

      {/* User tabs */}
      <div
        className="flex border-b border-nps-border overflow-x-auto"
        role="tablist"
      >
        {result.individual_readings.map(
          (reading: FrameworkReadingResponse, idx: number) => (
            <button
              key={idx}
              role="tab"
              aria-selected={activeTab === idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === idx
                  ? "border-nps-oracle-accent text-nps-oracle-accent"
                  : "border-transparent text-nps-text-dim hover:text-nps-text"
              }`}
              data-testid={`user-tab-${idx}`}
            >
              {reading.sign_value || `User ${idx + 1}`}
            </button>
          ),
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Individual reading summary for active tab */}
        {result.individual_readings[activeTab] && (
          <div className="bg-nps-bg-input rounded-lg p-4">
            <h4 className="font-medium text-nps-text-bright mb-2">
              {result.individual_readings[activeTab].sign_value ||
                `User ${activeTab + 1}`}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-nps-text-dim">
              <div>
                {t("oracle.fc60_stamp")}:{" "}
                <span className="font-mono text-xs">
                  {result.individual_readings[activeTab].fc60_stamp}
                </span>
              </div>
              {result.individual_readings[activeTab].confidence && (
                <div>
                  {t("oracle.confidence")}:{" "}
                  {result.individual_readings[activeTab].confidence.score}%
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compatibility grid */}
        <div>
          <h4 className="font-medium text-nps-text-bright mb-3">
            {t("oracle.compatibility")}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="compatibility-grid">
              <thead>
                <tr>
                  <th className="p-2" />
                  {userNames.map((name: string, i: number) => (
                    <th
                      key={i}
                      className="p-2 text-center font-medium text-nps-text-dim"
                    >
                      {name || `U${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userNames.map((rowName: string, i: number) => (
                  <tr key={i}>
                    <td className="p-2 font-medium text-nps-text-dim">
                      {rowName || `U${i + 1}`}
                    </td>
                    {userNames.map((_: string, j: number) => {
                      if (i === j) {
                        return (
                          <td
                            key={j}
                            className="p-2 text-center bg-nps-bg-hover"
                          >
                            —
                          </td>
                        );
                      }
                      const pair = result.pairwise_compatibility.find(
                        (p: PairwiseCompatibilityResult) =>
                          (p.user_a_id === i && p.user_b_id === j) ||
                          (p.user_a_id === j && p.user_b_id === i),
                      );
                      const score = pair?.overall_percentage ?? 0;
                      return (
                        <td
                          key={j}
                          className={`p-2 text-center cursor-pointer rounded ${getCellColor(score)}`}
                          onClick={() => pair && setSelectedPair(pair)}
                          data-testid={`cell-${i}-${j}`}
                        >
                          {Math.round(score)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pair detail breakdown */}
        {selectedPair && (
          <div className="bg-nps-bg-input rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-nps-text-bright">
                {selectedPair.user_a_name} &amp; {selectedPair.user_b_name}
              </h4>
              <button
                onClick={() => setSelectedPair(null)}
                className="text-sm text-nps-text-dim hover:text-nps-text"
              >
                &times;
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(selectedPair.dimensions).map(([dim, score]) => (
                <CompatibilityMeter
                  key={dim}
                  score={score as number}
                  label={dim}
                  size="sm"
                />
              ))}
            </div>
            {selectedPair.strengths.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-nps-success">
                  {t("oracle.strengths")}
                </p>
                <ul className="list-disc list-inside text-sm text-nps-text-dim">
                  {selectedPair.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {selectedPair.challenges.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-nps-error">
                  {t("oracle.challenges")}
                </p>
                <ul className="list-disc list-inside text-sm text-nps-text-dim">
                  {selectedPair.challenges.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Group analysis (3+ users) */}
        {result.group_analysis && (
          <div data-testid="group-analysis">
            <h4 className="font-medium text-nps-text-bright mb-3">
              {t("oracle.group_analysis")}
            </h4>
            <CompatibilityMeter
              score={result.group_analysis.group_harmony_percentage}
              label={t("oracle.group_harmony")}
              size="lg"
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-nps-bg-input rounded-lg p-3">
                <p className="text-xs text-nps-text-dim mb-1">
                  {t("oracle.element")}
                </p>
                <p className="font-medium text-nps-text-bright">
                  {result.group_analysis.dominant_element}
                </p>
                <div className="mt-2 space-y-1">
                  {Object.entries(result.group_analysis.element_balance).map(
                    ([el, count]) => (
                      <div
                        key={el}
                        className="flex justify-between text-xs text-nps-text-dim"
                      >
                        <span>{el}</span>
                        <span>{count as number}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="bg-nps-bg-input rounded-lg p-3">
                <p className="text-xs text-nps-text-dim mb-1">
                  {t("oracle.cosmic.ganzhi_title")}
                </p>
                <p className="font-medium text-nps-text-bright">
                  {result.group_analysis.dominant_animal}
                </p>
                <div className="mt-2 space-y-1">
                  {Object.entries(
                    result.group_analysis.animal_distribution,
                  ).map(([animal, count]) => (
                    <div
                      key={animal}
                      className="flex justify-between text-xs text-nps-text-dim"
                    >
                      <span>{animal}</span>
                      <span>{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {result.group_analysis.group_summary && (
              <p className="text-sm text-nps-text-dim mt-3">
                {result.group_analysis.group_summary}
              </p>
            )}
          </div>
        )}

        {/* AI interpretation */}
        {result.ai_interpretation && (
          <details className="border border-nps-border rounded-lg">
            <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-nps-oracle-accent">
              {t("oracle.ai_interpretation")}
            </summary>
            <div className="px-4 pb-4 text-sm text-nps-text-dim whitespace-pre-wrap">
              {result.ai_interpretation.full_text}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
