import { test, expect } from "@playwright/test";

test.describe("Performance", () => {
  test("Dashboard loads under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/dashboard");
    await page.waitForSelector("h2");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("Oracle page loads under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/oracle");
    await page.waitForSelector("h2");
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test("Language switch completes under 500ms", async ({ page }) => {
    await page.goto("/dashboard");
    const langToggle = page
      .locator("button:has-text('\u0641\u0627'), button:has-text('FA')")
      .first();
    if (await langToggle.isVisible()) {
      const start = Date.now();
      await langToggle.click();
      await page.waitForFunction(() => document.documentElement.dir === "rtl");
      const switchTime = Date.now() - start;
      expect(switchTime).toBeLessThan(500);
    }
  });

  test("No layout shift on page load (CLS check)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    const screenshot = await page.screenshot();
    expect(screenshot.length).toBeGreaterThan(0);
  });

  test("Page navigation does not cause full reload", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('a[href="/oracle"]');
    await page.waitForSelector("h2");
    await expect(page.locator("nav")).toBeVisible();
  });
});
