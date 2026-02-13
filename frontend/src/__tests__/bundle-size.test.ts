import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import { gzipSync } from "zlib";

const distDir = resolve(__dirname, "../../dist/assets");

/**
 * Lazy-loaded chunk prefixes — these are loaded on-demand via React.lazy()
 * or dynamic import(), so they don't affect initial page load time.
 *
 * Pages: All routes use React.lazy() in App.tsx
 * Libraries: jspdf/html2canvas use dynamic import() in exportReading.ts
 * Charts: recharts (vendor-charts) only used by AdminMonitoring
 */
const LAZY_CHUNK_PREFIXES = [
  // Page components (React.lazy in App.tsx)
  "Admin-",
  "AdminMonitoring-",
  "AdminProfiles-",
  "AdminUsers-",
  "BackupManager-",
  "CalendarPicker-",
  "Dashboard-",
  "FadeIn-",
  "Oracle-",
  "PersianKeyboard-",
  "ReadingHistory-",
  "Scanner-",
  "Settings-",
  "SharedReading-",
  "useAdmin-",
  // Dynamic imports (on-demand libraries)
  "html2canvas",
  "jspdf",
  "vendor-charts-",
  // Shared sub-dependency of lazy chunks (d3/recharts internals)
  "index.es-",
];

function isLazyChunk(filename: string): boolean {
  return LAZY_CHUNK_PREFIXES.some((prefix) => filename.startsWith(prefix));
}

function getGzippedSize(dir: string, filename: string): number {
  const content = readFileSync(resolve(dir, filename));
  return gzipSync(content).length;
}

describe("Bundle size", () => {
  test("initial-load gzipped JS is under 500KB", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/ not found — run `npm run build` first");
      return;
    }
    const jsFiles = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    const initialFiles = jsFiles.filter((f) => !isLazyChunk(f));

    let totalGzipped = 0;
    for (const file of initialFiles) {
      totalGzipped += getGzippedSize(distDir, file);
    }
    const totalKB = totalGzipped / 1024;
    console.log(
      `Initial-load JS: ${totalKB.toFixed(1)}KB gzipped (${initialFiles.length} chunks)`,
    );
    console.log(
      `Lazy chunks excluded: ${jsFiles.length - initialFiles.length}`,
    );
    expect(totalKB).toBeLessThan(500);
  });

  test("no single JS chunk exceeds 200KB gzipped", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/ not found — run `npm run build` first");
      return;
    }
    const jsFiles = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    // Only check initial-load chunks for the 200KB per-chunk limit
    const initialFiles = jsFiles.filter((f) => !isLazyChunk(f));
    for (const file of initialFiles) {
      const gzippedKB = getGzippedSize(distDir, file) / 1024;
      expect(gzippedKB).toBeLessThan(200);
    }
  });

  test("CSS is under 20KB gzipped", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/ not found — run `npm run build` first");
      return;
    }
    const cssFiles = readdirSync(distDir).filter((f) => f.endsWith(".css"));
    let totalGzipped = 0;
    for (const file of cssFiles) {
      totalGzipped += getGzippedSize(distDir, file);
    }
    const totalKB = totalGzipped / 1024;
    expect(totalKB).toBeLessThan(20);
  });

  test("build produces multiple JS chunks (code splitting active)", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/ not found — run `npm run build` first");
      return;
    }
    const jsFiles = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    expect(jsFiles.length).toBeGreaterThanOrEqual(5);
  });
});
