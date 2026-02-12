import * as fs from "fs";
import * as path from "path";
import glob from "glob";
const { sync: globSync } = glob;

// Known exceptions — brand names and technical terms that should NOT be translated
const KNOWN_EXCEPTIONS = [
  "NPS",
  "FC60",
  "Bitcoin",
  "BTC",
  "API",
  "Numerology Puzzle Solver",
  "PostgreSQL",
  "Rust",
  "UTC",
  "BPM",
  "SHA",
  "AES",
  "JSON",
  "CSV",
  "TXT",
  "Telegram",
  "Wisdom",
  "FrankenChron",
  "Wu Xing",
  "Ganzhi",
  "Pythagorean",
  "Chaldean",
  "Abjad",
  "Jalaali",
  "Gregorian",
  "Jalali",
  "Nowruz",
];

// Files/patterns to exclude from checking
const EXCLUSIONS = [
  "**/*.test.tsx",
  "**/*.test.ts",
  "**/i18n/**",
  "**/locales/**",
  "**/__tests__/**",
];

describe("no hardcoded strings", () => {
  const srcDir = path.resolve(__dirname, "..");
  const tsxFiles = globSync("**/*.tsx", {
    cwd: srcDir,
    ignore: EXCLUSIONS,
  });

  test("found tsx files to scan", () => {
    expect(tsxFiles.length).toBeGreaterThan(10);
  });

  // Check each file for obvious hardcoded JSX text
  test.each(tsxFiles)("%s has no obvious hardcoded page titles", (file) => {
    const content = fs.readFileSync(path.resolve(srcDir, file), "utf-8");
    const issues: string[] = [];
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      // Skip non-JSX lines
      if (
        line.trim().startsWith("import") ||
        line.trim().startsWith("//") ||
        line.trim().startsWith("*") ||
        line.trim().startsWith("/*") ||
        line.includes("className") ||
        line.includes("console.") ||
        line.includes("throw new") ||
        line.includes("aria-") ||
        line.includes("data-testid")
      )
        return;

      // Look for JSX text: >SomeTitle< (multi-word English text between tags)
      const matches = line.match(/>[A-Z][a-z]{2,}(?:\s+[a-zA-Z]+){1,}<\//g);
      if (matches) {
        const filtered = matches.filter((m) => {
          const text = m.slice(1, -2).trim();
          return !KNOWN_EXCEPTIONS.some((ex) => text.includes(ex));
        });
        if (filtered.length > 0) {
          issues.push(`Line ${idx + 1}: ${filtered.join(", ")}`);
        }
      }
    });

    // Allow some known stubs — but page titles should be translated
    expect(issues).toEqual([]);
  });
});
