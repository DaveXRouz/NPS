import { test, expect } from "@playwright/test";
import { login, takeStepScreenshot } from "./fixtures";

test.describe("Authentication & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("app loads and redirects to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");

    // NPS branding visible in sidebar or header
    await expect(page.locator("text=NPS").first()).toBeVisible();

    await takeStepScreenshot(page, "auth", "app-loaded");
  });

  test("sidebar shows all navigation links", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const nav = page.locator('nav[role="navigation"]');
    await expect(nav).toBeVisible();

    // Core nav links that should always be visible
    const expectedLinks = [
      "Dashboard",
      "Oracle",
      "Reading History",
      "Settings",
    ];
    for (const label of expectedLinks) {
      await expect(nav.locator(`text=${label}`).first()).toBeVisible();
    }

    // LanguageToggle visible in header (desktop) — role="switch"
    const langToggle = page.locator('button[role="switch"]').first();
    await expect(langToggle).toBeVisible();

    await takeStepScreenshot(page, "auth", "sidebar-links");
  });

  test("navigate to each page via sidebar clicks", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const pages = [
      { label: "Oracle", path: "/oracle" },
      { label: "Reading History", path: "/history" },
      { label: "Settings", path: "/settings" },
      { label: "Dashboard", path: "/dashboard" },
    ];

    for (const { label, path } of pages) {
      const link = page
        .locator('nav[role="navigation"]')
        .locator(`a:has-text("${label}")`)
        .first();
      await link.click();
      await page.waitForURL(`**${path}`);
      expect(page.url()).toContain(path);
      await takeStepScreenshot(
        page,
        "auth",
        `nav-${label.toLowerCase().replace(/\s+/g, "-")}`,
      );
    }
  });

  test("direct URL access works for all routes", async ({ page }) => {
    const routes = ["/dashboard", "/oracle", "/history", "/settings"];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      // Page should not show a blank error — main content area exists
      await expect(page.locator("#main-content")).toBeVisible({
        timeout: 10000,
      });
    }

    await takeStepScreenshot(page, "auth", "direct-url-access");
  });
});
