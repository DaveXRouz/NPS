import { test, expect } from "@playwright/test";
import {
  login,
  seedTestProfile,
  cleanupTestUsers,
  takeStepScreenshot,
} from "./fixtures";

test.describe("Oracle Profile CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestUsers(page);
  });

  test("create new profile via form", async ({ page }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Click "+ Add New Profile" button
    const addButton = page
      .locator("button:has-text('Add New Profile')")
      .first();
    await addButton.click();

    // Verify modal appears
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    // Fill name field (first text input in the form)
    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill("E2E_NewProfile");

    // Fill birthday via the calendar/date input
    const birthdayInput = dialog
      .locator('input[type="date"], input[type="text"]')
      .nth(1);
    if (await birthdayInput.isVisible().catch(() => false)) {
      await birthdayInput.fill("1990-06-15");
    }

    // Fill mother's name
    const motherInput = dialog.locator('input[type="text"]').nth(2);
    if (await motherInput.isVisible().catch(() => false)) {
      await motherInput.fill("E2E_TestMother");
    }

    await takeStepScreenshot(page, "profile", "form-filled");

    // Submit
    await dialog.locator('button[type="submit"]').click();

    // Wait for modal to close
    await expect(dialog).toBeHidden({ timeout: 10000 });

    // Verify profile appears in dropdown
    await expect(page.locator("text=E2E_NewProfile")).toBeVisible({
      timeout: 10000,
    });

    await takeStepScreenshot(page, "profile", "created-in-selector");
  });

  test("form validation rejects empty required fields", async ({ page }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    const addButton = page
      .locator("button:has-text('Add New Profile')")
      .first();
    await addButton.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    // Submit empty form immediately
    await dialog.locator('button[type="submit"]').click();

    // Validation errors should appear (role="alert" elements)
    const alerts = dialog.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible({ timeout: 5000 });

    // Should have at least 2 validation errors (name + mother_name; birthday may vary)
    const alertCount = await alerts.count();
    expect(alertCount).toBeGreaterThanOrEqual(2);

    await takeStepScreenshot(page, "profile", "validation-errors");
  });

  test("edit existing profile", async ({ page }) => {
    const profile = await seedTestProfile(page, { name: "E2E_EditTarget" });

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Select the profile from dropdown
    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Click "Edit Profile"
    const editButton = page.locator("button:has-text('Edit Profile')").first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Verify modal opens with pre-filled name
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    const nameInput = dialog.locator('input[type="text"]').first();
    await expect(nameInput).toHaveValue("E2E_EditTarget");

    // Click Save
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await takeStepScreenshot(page, "profile", "after-edit");
  });

  test("delete profile with two-step confirmation", async ({ page }) => {
    const profile = await seedTestProfile(page, { name: "E2E_DeleteTarget" });

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Select the profile
    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Open edit modal
    const editButton = page.locator("button:has-text('Edit Profile')").first();
    await editButton.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    // Click "Delete" — first step
    const deleteButton = dialog.locator("button:has-text('Delete')").last();
    await deleteButton.click();

    // Button should now say "Confirm Delete"
    await expect(
      dialog.locator("button:has-text('Confirm Delete')"),
    ).toBeVisible();

    await takeStepScreenshot(page, "profile", "delete-confirmation");

    // Click "Confirm Delete"
    await dialog.locator("button:has-text('Confirm Delete')").click();

    // Modal should close
    await expect(dialog).toBeHidden({ timeout: 10000 });

    // Profile should no longer be in dropdown
    await expect(page.locator(`option:has-text("${profile.name}")`)).toBeHidden(
      {
        timeout: 5000,
      },
    );

    // "Select a profile to begin readings." message visible
    await expect(page.locator("text=Select a profile")).toBeVisible();

    await takeStepScreenshot(page, "profile", "after-delete");
  });

  test("profile selection persists across page navigation", async ({
    page,
  }) => {
    const profile = await seedTestProfile(page, { name: "E2E_PersistTest" });

    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Select the profile
    const selector = page.locator("select[aria-label]").first();
    await selector.selectOption({ label: profile.name });

    // Verify birthday info visible (confirming selection)
    await expect(page.locator("text=1990-06-15")).toBeVisible();

    // Navigate away to settings
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Navigate back to oracle
    await page.goto("/oracle");
    await page.waitForLoadState("networkidle");

    // Profile should still be selected (localStorage persistence)
    await expect(page.locator("text=1990-06-15")).toBeVisible({
      timeout: 10000,
    });

    await takeStepScreenshot(page, "profile", "persisted-selection");
  });
});
