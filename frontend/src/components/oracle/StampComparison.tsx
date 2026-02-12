import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FC60StampData } from "@/types";
import FC60StampDisplay from "./FC60StampDisplay";

interface StampComparisonProps {
  stamps: {
    userName: string;
    stamp: FC60StampData;
  }[];
  highlightShared?: boolean;
}

function collectAnimals(stamp: FC60StampData): string[] {
  const animals: string[] = [];
  if (stamp.month.token) animals.push(stamp.month.token);
  const domAnimal = stamp.dom.token?.slice(0, 2);
  if (domAnimal) animals.push(domAnimal);
  if (stamp.time) {
    if (stamp.time.hour.token) animals.push(stamp.time.hour.token);
    const minAnimal = stamp.time.minute.token?.slice(0, 2);
    if (minAnimal) animals.push(minAnimal);
    const secAnimal = stamp.time.second.token?.slice(0, 2);
    if (secAnimal) animals.push(secAnimal);
  }
  return animals;
}

function collectElements(stamp: FC60StampData): string[] {
  const elements: string[] = [];
  const domElement = stamp.dom.token?.slice(2, 4);
  if (domElement) elements.push(domElement);
  if (stamp.time) {
    const minElement = stamp.time.minute.token?.slice(2, 4);
    if (minElement) elements.push(minElement);
    const secElement = stamp.time.second.token?.slice(2, 4);
    if (secElement) elements.push(secElement);
  }
  return elements;
}

export default function StampComparison({
  stamps,
  highlightShared = true,
}: StampComparisonProps) {
  const { t } = useTranslation();

  const { sharedAnimals, sharedElements } = useMemo(() => {
    if (!highlightShared || stamps.length < 2) {
      return {
        sharedAnimals: new Set<string>(),
        sharedElements: new Set<string>(),
      };
    }

    const allAnimals = stamps.map((s) => new Set(collectAnimals(s.stamp)));
    const allElements = stamps.map((s) => new Set(collectElements(s.stamp)));

    const shared = new Set<string>();
    const sharedEl = new Set<string>();

    for (let i = 0; i < allAnimals.length; i++) {
      for (let j = i + 1; j < allAnimals.length; j++) {
        for (const a of allAnimals[i]) {
          if (allAnimals[j].has(a)) shared.add(a);
        }
      }
    }

    for (let i = 0; i < allElements.length; i++) {
      for (let j = i + 1; j < allElements.length; j++) {
        for (const e of allElements[i]) {
          if (allElements[j].has(e)) sharedEl.add(e);
        }
      }
    }

    return { sharedAnimals: shared, sharedElements: sharedEl };
  }, [stamps, highlightShared]);

  const sharedAnimalCount = sharedAnimals.size;
  const sharedElementCount = sharedElements.size;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {t("oracle.fc60_comparison_title")}
      </h3>

      {/* Stamps grid: side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stamps.map((entry, idx) => (
          <div
            key={idx}
            className={`border border-gray-700 rounded-lg p-3 space-y-2 ${
              highlightShared && sharedAnimalCount > 0
                ? "ring-1 ring-emerald-400/30"
                : ""
            }`}
          >
            <h4 className="text-sm font-medium text-gray-300 truncate">
              {entry.userName}
            </h4>
            <FC60StampDisplay
              stamp={entry.stamp}
              size="compact"
              showTooltips={true}
              showCopyButton={false}
            />
          </div>
        ))}
      </div>

      {/* Shared summary */}
      {highlightShared &&
        stamps.length >= 2 &&
        (sharedAnimalCount > 0 || sharedElementCount > 0) && (
          <div className="flex flex-wrap gap-2 text-sm">
            {sharedAnimalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                {sharedAnimalCount} {t("oracle.fc60_shared_animals")}
                {highlightShared && (
                  <span className="text-xs text-gray-400">
                    (
                    {[...sharedAnimals]
                      .map((a) =>
                        t(`oracle.fc60_animals_${a}`, { defaultValue: a }),
                      )
                      .join(", ")}
                    )
                  </span>
                )}
              </span>
            )}
            {sharedElementCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
                {sharedElementCount} {t("oracle.fc60_shared_elements")}
                {highlightShared && (
                  <span className="text-xs text-gray-400">
                    (
                    {[...sharedElements]
                      .map((e) =>
                        t(`oracle.fc60_elements_${e}`, { defaultValue: e }),
                      )
                      .join(", ")}
                    )
                  </span>
                )}
              </span>
            )}
          </div>
        )}
    </div>
  );
}
