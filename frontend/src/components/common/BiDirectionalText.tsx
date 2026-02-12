import type { ReactNode } from "react";

interface BiDirectionalTextProps {
  children: ReactNode;
  forceDir?: "ltr" | "rtl";
  as?: "span" | "p" | "div";
  className?: string;
}

const LATIN_RE = /[A-Za-z0-9]/g;
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;

function detectDir(text: string): "ltr" | "rtl" {
  const latinCount = (text.match(LATIN_RE) ?? []).length;
  const arabicCount = (text.match(ARABIC_RE) ?? []).length;
  return arabicCount > latinCount ? "rtl" : "ltr";
}

/**
 * Wraps mixed-direction content using <bdi> to isolate direction.
 * Use `forceDir` for known-direction content (numbers, technical terms).
 * Without `forceDir`, auto-detects based on character majority.
 */
export function BiDirectionalText({
  children,
  forceDir,
  as: Tag = "span",
  className,
}: BiDirectionalTextProps) {
  const dir =
    forceDir ?? (typeof children === "string" ? detectDir(children) : "ltr");

  return (
    <Tag dir={dir} className={className} style={{ unicodeBidi: "isolate" }}>
      {children}
    </Tag>
  );
}
