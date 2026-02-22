/**
 * Normalize ai_interpretation which may be a string (legacy) or an
 * AIInterpretationSections object (framework endpoint).  Returns the
 * plain-text string in both cases, or null if empty.
 */
export function normalizeAiInterpretation(
  value: string | { full_text?: string } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "full_text" in value)
    return value.full_text ?? null;
  return null;
}
