import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import { gzipSync } from "zlib";

const distDir = resolve(__dirname, "../../dist/assets");

describe("Bundle size", () => {
  test("total gzipped JS is under 500KB", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/ not found — run `npm run build` first");
      return;
    }
    const jsFiles = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    let totalGzipped = 0;
    for (const file of jsFiles) {
      const content = readFileSync(resolve(distDir, file));
      totalGzipped += gzipSync(content).length;
    }
    const totalKB = totalGzipped / 1024;
    expect(totalKB).toBeLessThan(500);
  });

  test("no single JS chunk exceeds 200KB gzipped", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/ not found — run `npm run build` first");
      return;
    }
    const jsFiles = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    for (const file of jsFiles) {
      const content = readFileSync(resolve(distDir, file));
      const gzippedKB = gzipSync(content).length / 1024;
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
      const content = readFileSync(resolve(distDir, file));
      totalGzipped += gzipSync(content).length;
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
