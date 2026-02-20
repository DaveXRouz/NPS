interface InterpretationSection {
  heading?: string;
  body: string;
}

/**
 * Parse an AI interpretation string into structured sections.
 *
 * Handles two separator patterns:
 * 1. `## Heading` markdown headers
 * 2. `————` (em-dash separator) legacy pattern
 *
 * Fallback: splits on double newlines into paragraphs.
 */
export function formatAiInterpretation(raw: string): InterpretationSection[] {
  if (!raw || typeof raw !== "string") return [];

  const trimmed = raw.trim();

  // Try markdown headers first (## Heading)
  if (/^##\s+/m.test(trimmed)) {
    return parseMarkdownHeaders(trimmed);
  }

  // Try em-dash separator (————)
  if (/[—]{3,}/.test(trimmed)) {
    return parseEmDashSeparator(trimmed);
  }

  // Fallback: split on double newlines
  return trimmed
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((body) => ({ body }));
}

function parseMarkdownHeaders(text: string): InterpretationSection[] {
  const sections: InterpretationSection[] = [];
  const parts = text.split(/^##\s+/m);

  for (const part of parts) {
    const trimPart = part.trim();
    if (!trimPart) continue;

    const newlineIdx = trimPart.indexOf("\n");
    if (newlineIdx === -1) {
      // Heading only, no body
      sections.push({ heading: trimPart, body: "" });
    } else {
      const heading = trimPart.slice(0, newlineIdx).trim();
      const body = trimPart.slice(newlineIdx + 1).trim();
      if (heading && body) {
        sections.push({ heading, body });
      } else if (body) {
        sections.push({ body });
      } else if (heading) {
        sections.push({ heading, body: "" });
      }
    }
  }

  return sections.length > 0 ? sections : [{ body: text }];
}

function parseEmDashSeparator(text: string): InterpretationSection[] {
  return text
    .split(/[—]{3,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((body) => ({ body }));
}
