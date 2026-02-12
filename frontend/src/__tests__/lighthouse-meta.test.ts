import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("SEO meta tags", () => {
  const html = readFileSync(resolve(__dirname, "../../index.html"), "utf-8");

  test("has viewport meta tag", () => {
    expect(html).toContain('name="viewport"');
  });

  test("has description meta tag", () => {
    expect(html).toContain('name="description"');
  });

  test("has theme-color meta tag", () => {
    expect(html).toContain('name="theme-color"');
  });

  test("has Open Graph title", () => {
    expect(html).toContain('property="og:title"');
  });

  test("has lang attribute support in App", () => {
    const appCode = readFileSync(resolve(__dirname, "../App.tsx"), "utf-8");
    expect(appCode).toContain("documentElement.lang");
  });
});
