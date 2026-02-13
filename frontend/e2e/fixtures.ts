import { Page, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const API_BASE = "http://localhost:8000";

export function getAuthToken(): string {
  return process.env.API_SECRET_KEY || "changeme-generate-a-real-secret";
}

export function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Handle login — adaptive for both auth-gated and non-gated scenarios.
 */
export async function login(
  page: Page,
  username: string = "admin",
  password: string = "admin",
): Promise<void> {
  await page.goto("/");

  const loginForm = page.locator(
    "[data-testid='login-form'], form[action*='login'], input[name='username']",
  );
  if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page
      .locator("input[name='username'], input[type='text']")
      .first()
      .fill(username);
    await page
      .locator("input[name='password'], input[type='password']")
      .first()
      .fill(password);
    await page.locator("button[type='submit']").first().click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  } else {
    await page.evaluate((token) => {
      localStorage.setItem("nps_auth_token", token);
    }, getAuthToken());
    await page.goto("/dashboard");
  }
  await page.waitForLoadState("networkidle");
}

export interface TestProfile {
  id: number;
  name: string;
  birthday: string;
  mother_name: string;
  country?: string;
  city?: string;
}

/**
 * Seed a test profile via API. Returns full profile object with ID.
 */
export async function seedTestProfile(
  page: Page,
  overrides: Partial<TestProfile> = {},
): Promise<TestProfile> {
  const defaults = {
    name: `E2E_Profile_${Date.now()}`,
    birthday: "1990-06-15",
    mother_name: "E2E_Mother",
    country: "US",
    city: "Test City",
  };
  const data = { ...defaults, ...overrides };
  const response = await page.request.post(`${API_BASE}/api/oracle/users`, {
    data,
    headers: authHeaders(),
  });
  const json = await response.json();
  return { ...data, id: json.id };
}

/**
 * Seed multiple test profiles for multi-user tests.
 */
export async function seedMultipleProfiles(
  page: Page,
  count: number,
): Promise<TestProfile[]> {
  const profiles: TestProfile[] = [];
  const birthdays = [
    "1990-06-15",
    "1985-03-22",
    "1992-11-08",
    "1988-01-30",
    "1995-07-04",
  ];
  for (let i = 0; i < count; i++) {
    const profile = await seedTestProfile(page, {
      name: `E2E_Multi_${i}_${Date.now()}`,
      birthday: birthdays[i % birthdays.length],
      mother_name: `E2E_Mother_${i}`,
    });
    profiles.push(profile);
  }
  return profiles;
}

/**
 * Capture a named screenshot at a test step.
 */
export async function takeStepScreenshot(
  page: Page,
  testName: string,
  stepName: string,
): Promise<void> {
  const dir = path.join(__dirname, "..", "e2e-screenshots");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const safeName = `${testName}--${stepName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  await page.screenshot({
    path: path.join(dir, `${safeName}.png`),
    fullPage: true,
  });
}

/**
 * Wait for API server to be ready by polling health endpoint.
 */
export async function waitForApiReady(
  page: Page,
  maxRetries: number = 10,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.request.get(`${API_BASE}/health`);
      if (response.ok()) return;
    } catch {
      // API not ready yet
    }
    await page.waitForTimeout(1000);
  }
  throw new Error("API server not ready after retries");
}

/**
 * Switch to Farsi locale via LanguageToggle.
 */
export async function switchToFarsi(page: Page): Promise<void> {
  const htmlLang = await page.locator("html").getAttribute("lang");
  if (htmlLang === "fa") return;
  const toggle = page.locator('button[role="switch"]').first();
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl", {
    timeout: 5000,
  });
}

/**
 * Switch to English locale via LanguageToggle.
 */
export async function switchToEnglish(page: Page): Promise<void> {
  const htmlLang = await page.locator("html").getAttribute("lang");
  if (htmlLang === "en" || !htmlLang) return;
  const toggle = page.locator('button[role="switch"]').first();
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr", {
    timeout: 5000,
  });
}

/**
 * Create a test user via API for E2E tests (legacy helper).
 * Returns the user ID.
 */
export async function createTestUser(
  page: Page,
  name: string = "E2E_TestUser",
): Promise<number> {
  const response = await page.request.post(`${API_BASE}/api/oracle/users`, {
    data: {
      name,
      birthday: "1990-06-15",
      mother_name: "E2E_Mother",
      country: "US",
      city: "Test City",
    },
    headers: authHeaders(),
  });
  const data = await response.json();
  return data.id;
}

/**
 * Clean up test users created during E2E tests.
 */
export async function cleanupTestUsers(page: Page): Promise<void> {
  try {
    const response = await page.request.get(
      `${API_BASE}/api/oracle/users?search=E2E_`,
      { headers: { Authorization: `Bearer ${getAuthToken()}` } },
    );
    const data = await response.json();
    for (const user of data.users || []) {
      await page.request.delete(`${API_BASE}/api/oracle/users/${user.id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
    }
  } catch {
    // Cleanup failures should not break tests
  }
}
