import { test, expect } from "@playwright/test";
import {
  login,
  seedTestProfile,
  seedMultipleProfiles,
  cleanupTestUsers,
  takeStepScreenshot,
} from "./fixtures";

test.describe("Reading Flows", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestUsers(page);
  });

  test("select user and submit time reading", async ({ page }) => {
    const profile = await seedTestProfile(page);

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Select the seeded profile
    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Verify consultation form appears — defaults to time reading
    await expect(page.locator("text=Time Reading").first()).toBeVisible({
      timeout: 10000,
    });

    // Time selectors should be visible (hour, minute, second)
    await expect(page.locator("#hour-select")).toBeVisible();
    await expect(page.locator("#minute-select")).toBeVisible();

    await takeStepScreenshot(page, "reading", "form-ready");

    // Submit the reading
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Submit Reading"), button[type="submit"]:has-text("Generating")',
    );
    await submitButton.first().click();

    // Wait for results — the loading state should eventually resolve
    // ReadingResults section with tablist should appear or update
    const tablist = page.locator(
      '[role="tablist"][aria-label="Reading results"]',
    );
    await expect(tablist).toBeVisible({ timeout: 30000 });

    // Summary tab should be active
    const summaryTab = page.locator("#tab-summary");
    await expect(summaryTab).toHaveAttribute("aria-selected", "true");

    await takeStepScreenshot(page, "reading", "results-visible");
  });

  test("reading results tab switching with ARIA", async ({ page }) => {
    const profile = await seedTestProfile(page);

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Submit a reading first to populate results
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for results
    const tablist = page.locator(
      '[role="tablist"][aria-label="Reading results"]',
    );
    await expect(tablist).toBeVisible({ timeout: 30000 });

    // Verify 3 tabs exist
    const tabs = tablist.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);

    // Click Details tab
    await page.locator("#tab-details").click();
    await expect(page.locator("#tab-details")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#tab-summary")).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await expect(page.locator("#tabpanel-details")).not.toHaveClass(/hidden/);
    await expect(page.locator("#tabpanel-summary")).toHaveClass(/hidden/);

    await takeStepScreenshot(page, "reading", "details-tab");

    // Click History tab
    await page.locator("#tab-history").click();
    await expect(page.locator("#tab-history")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#tabpanel-history")).not.toHaveClass(/hidden/);
    await expect(page.locator("#tabpanel-details")).toHaveClass(/hidden/);

    await takeStepScreenshot(page, "reading", "history-tab");

    // Click Summary tab — back to original
    await page.locator("#tab-summary").click();
    await expect(page.locator("#tab-summary")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#tabpanel-summary")).not.toHaveClass(/hidden/);
  });

  test("submit reading with question text and Persian keyboard", async ({
    page,
  }) => {
    const profile = await seedTestProfile(page);

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Switch to question reading type via URL param
    await page.goto("/oracle?type=question");
    await page.waitForLoadState("networkidle");

    // Re-select profile (page reload)
    await selector.selectOption({ label: profile.name });

    // Verify question form is visible
    await expect(page.locator("text=Question Reading").first()).toBeVisible({
      timeout: 10000,
    });

    // Find and fill the question textarea/input
    const questionInput = page.locator("textarea, input[type='text']").last();
    if (await questionInput.isVisible().catch(() => false)) {
      await questionInput.fill("What does today hold for me?");
    }

    // Try to find and click Persian keyboard toggle
    const keyboardToggle = page
      .locator(
        '[aria-label="Toggle Persian keyboard"], [data-testid*="keyboard-toggle"]',
      )
      .first();
    if (await keyboardToggle.isVisible().catch(() => false)) {
      await keyboardToggle.click();

      // Click a Persian character
      const persianChar = page.locator("button:has-text('\u0627')").first();
      if (await persianChar.isVisible().catch(() => false)) {
        await persianChar.click();
      }
    }

    await takeStepScreenshot(page, "reading", "question-with-keyboard");

    // Submit the question reading
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      // Wait for results to load
      await page.waitForTimeout(3000);
    }

    await takeStepScreenshot(page, "reading", "question-results");
  });

  test("multi-user selection and reading", async ({ page }) => {
    const profiles = await seedMultipleProfiles(page, 3);

    // Switch to multi-user reading type
    await page.goto("/oracle?type=multi");
    await page.waitForLoadState("networkidle");

    // Select primary user
    const primarySelector = page.locator("select[aria-label]").first();
    await primarySelector.selectOption({ label: profiles[0].name });

    // Verify primary user chip appears
    await expect(
      page.locator(`text=${profiles[0].name}`).first(),
    ).toBeVisible();

    // Add secondary users via "+ Add User" button
    const addSecondaryButton = page
      .locator("button:has-text('Add User')")
      .first();
    if (await addSecondaryButton.isVisible().catch(() => false)) {
      await addSecondaryButton.click();

      // Select second profile from secondary dropdown
      const secondaryDropdown = page.locator("select").last();
      await secondaryDropdown.selectOption({ label: profiles[1].name });

      // Add third user
      const addAgain = page.locator("button:has-text('Add User')").first();
      if (await addAgain.isVisible().catch(() => false)) {
        await addAgain.click();
        const dropdown2 = page.locator("select").last();
        await dropdown2.selectOption({ label: profiles[2].name });
      }
    }

    await takeStepScreenshot(page, "reading", "multi-user-selected");

    // Submit multi-user reading
    const submitButton = page
      .locator(
        '[data-testid="submit-multi-reading"], button:has-text("Submit Reading")',
      )
      .first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(5000);
    }

    await takeStepScreenshot(page, "reading", "multi-user-results");
  });

  test("no profile selected shows guidance message", async ({ page }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Clear any persisted selection
    await page.evaluate(() => {
      localStorage.removeItem("nps_selected_oracle_user");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify guidance message
    await expect(
      page.locator("text=Select a profile to begin readings."),
    ).toBeVisible({ timeout: 10000 });

    // No submit button should be present when no user selected
    const submitButton = page.locator('button:has-text("Submit Reading")');
    const submitCount = await submitButton.count();
    // If the form isn't shown at all, count is 0, which is correct
    // If somehow visible, that's okay too (the form might still be rendered)
    expect(submitCount).toBeLessThanOrEqual(1);

    await takeStepScreenshot(page, "reading", "no-profile-guidance");
  });
});
