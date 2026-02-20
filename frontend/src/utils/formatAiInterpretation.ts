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
 * When no structure is detected and text is long, auto-injects section
 * breaks every ~3 paragraphs and splits long paragraphs at sentence
 * boundaries for readability.
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

  // Fallback: split on double newlines, then improve readability
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  // If only one paragraph and it's long, try splitting at sentence boundaries
  const expanded = paragraphs.flatMap((p) => splitLongParagraph(p, 300));

  // For short text (< 500 chars or <= 2 paragraphs), return as-is
  if (trimmed.length < 500 || expanded.length <= 2) {
    return expanded.map((body) => ({ body }));
  }

  // For long unstructured text, group into sections of ~3 paragraphs
  return groupIntoSections(expanded, 3);
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

/**
 * Split a paragraph that exceeds maxLength at the nearest sentence boundary.
 * Sentence boundaries: ". ", "! ", "? " followed by an uppercase letter.
 */
function splitLongParagraph(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const results: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Find last sentence boundary within maxLength
    const chunk = remaining.slice(0, maxLength);
    const sentenceEnd = Math.max(
      chunk.lastIndexOf(". "),
      chunk.lastIndexOf("! "),
      chunk.lastIndexOf("? "),
    );

    if (sentenceEnd > maxLength * 0.3) {
      // Split at sentence boundary (include the punctuation)
      results.push(remaining.slice(0, sentenceEnd + 1).trim());
      remaining = remaining.slice(sentenceEnd + 2).trim();
    } else {
      // No good sentence boundary — keep as one piece
      break;
    }
  }

  if (remaining) {
    results.push(remaining);
  }

  return results;
}

/**
 * Group paragraphs into sections of `groupSize`, adding visual separation.
 * Each group becomes one InterpretationSection with paragraphs joined by
 * double newlines (rendered as separate <p> elements by the component).
 */
function groupIntoSections(
  paragraphs: string[],
  groupSize: number,
): InterpretationSection[] {
  const sections: InterpretationSection[] = [];

  for (let i = 0; i < paragraphs.length; i += groupSize) {
    const group = paragraphs.slice(i, i + groupSize);
    sections.push({ body: group.join("\n\n") });
  }

  return sections;
}
