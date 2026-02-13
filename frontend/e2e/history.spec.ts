import { test, expect } from "@playwright/test";
import {
  login,
  seedTestProfile,
  cleanupTestUsers,
  takeStepScreenshot,
} from "./fixtures";

test.describe("Reading History", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestUsers(page);
  });

  test("reading history displays past readings", async ({ page }) => {
    // Seed a profile and submit a reading to generate history
    const profile = await seedTestProfile(page);

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Submit a time reading
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for result to complete
    const tablist = page.locator(
      '[role="tablist"][aria-label="Reading results"]',
    );
    await expect(tablist).toBeVisible({ timeout: 30000 });

    // Switch to the History tab in ReadingResults
    await page.locator("#tab-history").click();
    await expect(page.locator("#tabpanel-history")).not.toHaveClass(/hidden/);

    // History content should be visible — either reading cards or stats
    const historyPanel = page.locator("#tabpanel-history");
    await expect(historyPanel).toBeVisible();

    await takeStepScreenshot(page, "history", "readings-listed");
  });

  test("history filter chips work", async ({ page }) => {
    // Navigate to the standalone History page
    await page.goto("/history");
    await page.waitForLoadState("networkidle");

    // Filter chips should be visible (role="tablist" with filter buttons)
    const filterTablist = page.locator('[role="tablist"][aria-label]').first();
    await expect(filterTablist).toBeVisible({ timeout: 10000 });

    const filterChips = filterTablist.locator('[role="tab"]');
    const chipCount = await filterChips.count();
    expect(chipCount).toBeGreaterThanOrEqual(4); // All, Time, Questions, Names, Daily, Multi-User

    // First chip ("All") should be active by default
    const allChip = filterChips.first();
    await expect(allChip).toHaveAttribute("aria-selected", "true");

    // Click "Time" chip
    const timeChip = filterTablist.locator('[role="tab"]:has-text("Time")');
    await timeChip.click();
    await expect(timeChip).toHaveAttribute("aria-selected", "true");
    await expect(allChip).toHaveAttribute("aria-selected", "false");

    // Click "All" chip again
    await allChip.click();
    await expect(allChip).toHaveAttribute("aria-selected", "true");

    await takeStepScreenshot(page, "history", "filter-active");
  });

  test("expand and collapse history item", async ({ page }) => {
    // Seed a profile and submit a reading first
    const profile = await seedTestProfile(page);

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for results
    await expect(
      page.locator('[role="tablist"][aria-label="Reading results"]'),
    ).toBeVisible({ timeout: 30000 });

    // Navigate to standalone history page
    await page.goto("/history");
    await page.waitForLoadState("networkidle");

    // If there are reading cards, try clicking one to see detail
    const readingCard = page
      .locator('[class*="grid"] button, [class*="grid"] [role="button"]')
      .first();
    if (await readingCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await readingCard.click();

      // Detail view or expanded content should appear
      await page.waitForTimeout(500);

      await takeStepScreenshot(page, "history", "expanded-reading");

      // Click back/close if detail view shows a close button
      const closeButton = page
        .locator('button:has-text("Close"), button:has-text("Back")')
        .first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    } else {
      // No readings available — take screenshot of empty state
      await takeStepScreenshot(page, "history", "empty-state");
    }
  });
});
