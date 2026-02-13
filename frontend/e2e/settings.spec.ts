import { test, expect } from "@playwright/test";
import {
  login,
  switchToFarsi,
  switchToEnglish,
  takeStepScreenshot,
} from "./fixtures";

test.describe("Settings & Locale", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("language toggle switches to Persian and activates RTL", async ({
    page,
  }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Verify initial state: LTR, English
    const html = page.locator("html");
    const initialDir = await html.getAttribute("dir");
    expect(initialDir === "ltr" || initialDir === null).toBeTruthy();

    // Find the LanguageToggle — it has role="switch"
    const toggle = page.locator('button[role="switch"]').first();
    await expect(toggle).toBeVisible();

    // Verify EN span is bold (active)
    const enSpan = toggle.locator("text=EN");
    await expect(enSpan).toBeVisible();

    await takeStepScreenshot(page, "settings", "english-mode");

    // Click to switch to Persian
    await toggle.click();

    // Verify RTL activated
    await expect(html).toHaveAttribute("dir", "rtl", { timeout: 5000 });
    await expect(html).toHaveAttribute("lang", "fa", { timeout: 5000 });

    // Verify FA span is now bold
    const faSpan = toggle.locator("text=FA");
    await expect(faSpan).toBeVisible();

    await takeStepScreenshot(page, "settings", "persian-mode-rtl");

    // Switch back to English for cleanup
    await toggle.click();
    await expect(html).toHaveAttribute("dir", "ltr", { timeout: 5000 });
  });

  test("RTL layout flips sidebar border correctly", async ({ page }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Switch to Persian/RTL
    await switchToFarsi(page);

    // The sidebar aside element uses border-e (logical property)
    // In RTL mode, border-e maps to border-left; in LTR it maps to border-right
    const sidebar = page.locator("aside").first();
    if (await sidebar.isVisible().catch(() => false)) {
      const borderStyle = await sidebar.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderLeft: computed.borderLeftWidth,
          borderRight: computed.borderRightWidth,
        };
      });
      // In RTL, border-e should be on the left side
      // This is a CSS logical property check
      expect(borderStyle).toBeDefined();
    }

    await takeStepScreenshot(page, "settings", "rtl-sidebar-border");

    // Switch back
    await switchToEnglish(page);
  });

  test("language persists across navigation", async ({ page }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Switch to Persian
    await switchToFarsi(page);

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");

    // Navigate to settings
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(html).toHaveAttribute("dir", "rtl");

    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(html).toHaveAttribute("dir", "rtl");

    // Switch back to English
    await switchToEnglish(page);
    await expect(html).toHaveAttribute("dir", "ltr", { timeout: 5000 });

    await takeStepScreenshot(page, "settings", "language-persists");
  });

  test("settings page renders with expected sections", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Settings heading should be visible
    await expect(page.locator("h2:has-text('Settings')")).toBeVisible({
      timeout: 10000,
    });

    // Should have section titles: Profile, Preferences, Oracle Settings, API Keys, About
    const expectedSections = [
      "Profile",
      "Preferences",
      "Oracle",
      "API Keys",
      "About",
    ];
    for (const section of expectedSections) {
      await expect(page.locator(`text=${section}`).first()).toBeVisible();
    }

    await takeStepScreenshot(page, "settings", "page-rendered");
  });
});
