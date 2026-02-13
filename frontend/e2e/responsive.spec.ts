import { test, expect } from "@playwright/test";
import {
  login,
  seedTestProfile,
  cleanupTestUsers,
  switchToFarsi,
  switchToEnglish,
  takeStepScreenshot,
} from "./fixtures";

/**
 * Session 43: Mobile viewport E2E tests (375x812).
 * Extends the existing responsive tests with login, profile, reading, and RTL flows.
 */

test.describe("Responsive — Mobile 375px (Session 43)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestUsers(page);
  });

  test("app loads at mobile viewport without overflow", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Main content area visible
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 10000 });

    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBeFalsy();

    // Mobile hamburger button should be visible (lg:hidden shows below lg breakpoint)
    const hamburger = page.locator('button[aria-label="Open menu"]');
    await expect(hamburger).toBeVisible();

    await takeStepScreenshot(page, "responsive", "mobile-dashboard");
  });

  test("oracle page usable at mobile viewport", async ({ page }) => {
    const profile = await seedTestProfile(page);

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBeFalsy();

    // Profile dropdown should be visible
    const selector = page.locator("select[aria-label]").first();
    await expect(selector).toBeVisible();

    // Select the profile
    await selector.selectOption({ label: profile.name });

    // Submit button should be reachable
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();

    await takeStepScreenshot(page, "responsive", "mobile-oracle");
  });

  test("profile form modal fits mobile screen", async ({ page }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Open add profile modal
    const addButton = page
      .locator("button:has-text('Add New Profile')")
      .first();
    await addButton.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    // Modal should fit within viewport
    const modalBox = await dialog.locator("div").first().boundingBox();
    if (modalBox) {
      expect(modalBox.width).toBeLessThanOrEqual(375);
    }

    // Form inputs should be visible
    const nameInput = dialog.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();

    // Submit and cancel buttons should be visible
    const submitButton = dialog.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    await takeStepScreenshot(page, "responsive", "mobile-profile-form");

    // Close modal
    await dialog.locator("button:has-text('Cancel')").click();
  });

  test("reading results render at mobile viewport", async ({ page }) => {
    const profile = await seedTestProfile(page);

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Submit a reading
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for results
    const tablist = page.locator(
      '[role="tablist"][aria-label="Reading results"]',
    );
    await expect(tablist).toBeVisible({ timeout: 30000 });

    // Tabs should be visible and tappable
    const tabs = tablist.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const tab = tabs.nth(i);
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForTimeout(200);
    }

    // No horizontal overflow after showing results
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBeFalsy();

    await takeStepScreenshot(page, "responsive", "mobile-reading-results");
  });

  test("RTL mode at mobile viewport", async ({ page }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Switch to RTL
    await switchToFarsi(page);

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");

    // No horizontal overflow in RTL + mobile
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBeFalsy();

    await takeStepScreenshot(page, "responsive", "mobile-rtl-oracle");

    // Switch back
    await switchToEnglish(page);
  });
});

/* ── Existing responsive tests from prior sessions (preserved) ── */

test.describe("Responsive — Mobile (375px)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("sidebar is hidden on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();
  });

  test("hamburger menu is visible", async ({ page }) => {
    await page.goto("/dashboard");
    const hamburger = page
      .locator("button[aria-label*='menu'], button[aria-label*='Menu']")
      .first();
    await expect(hamburger).toBeVisible();
  });

  test("drawer opens on hamburger click", async ({ page }) => {
    await page.goto("/dashboard");
    const hamburger = page
      .locator("button[aria-label*='menu'], button[aria-label*='Menu']")
      .first();
    await hamburger.click();
    const drawer = page.locator("[role='dialog']");
    await expect(drawer).toBeVisible();
  });

  test("stats cards are single column", async ({ page }) => {
    await page.goto("/dashboard");
    const statsGrid = page.locator("[data-testid='stats-cards']");
    if (await statsGrid.isVisible()) {
      const gridClass = await statsGrid.getAttribute("class");
      expect(gridClass).toContain("grid-cols-1");
    }
  });

  test("no horizontal overflow on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe("Responsive — Tablet (768px)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("sidebar is hidden on tablet (below lg)", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();
  });

  test("hamburger is visible on tablet", async ({ page }) => {
    await page.goto("/dashboard");
    const hamburger = page
      .locator("button[aria-label*='menu'], button[aria-label*='Menu']")
      .first();
    await expect(hamburger).toBeVisible();
  });

  test("stats cards use 2-column grid", async ({ page }) => {
    await page.goto("/dashboard");
    const statsGrid = page.locator("[data-testid='stats-cards']");
    if (await statsGrid.isVisible()) {
      const gridClass = await statsGrid.getAttribute("class");
      expect(gridClass).toContain("sm:grid-cols-2");
    }
  });
});

test.describe("Responsive — Desktop (1440px)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("sidebar is visible on desktop", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
  });

  test("hamburger is hidden on desktop", async ({ page }) => {
    await page.goto("/dashboard");
    const hamburger = page
      .locator("button[aria-label*='menu'], button[aria-label*='Menu']")
      .first();
    await expect(hamburger).toBeHidden();
  });

  test("stats cards use 4-column grid", async ({ page }) => {
    await page.goto("/dashboard");
    const statsGrid = page.locator("[data-testid='stats-cards']");
    if (await statsGrid.isVisible()) {
      const gridClass = await statsGrid.getAttribute("class");
      expect(gridClass).toContain("lg:grid-cols-4");
    }
  });
});

test.describe("Responsive — RTL Mobile (375px, FA)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("drawer direction is RTL when locale is FA", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() => {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "fa";
    });

    const hamburger = page
      .locator("button[aria-label*='menu'], button[aria-label*='Menu']")
      .first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      const drawer = page.locator("[role='dialog']");
      await expect(drawer).toBeVisible();
      const drawerClass = await drawer.getAttribute("class");
      expect(drawerClass).toBeTruthy();
    }
  });
});
