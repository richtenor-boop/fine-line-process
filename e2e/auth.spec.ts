import { test, expect } from "@playwright/test";

/**
 * Phase 1 primary flow (source spec §35 / §33): register an organization, land on the
 * dashboard, sign out, sign back in. Requires the app running against a migrated database
 * (`npm run db:migrate && npm run dev`, or let the Playwright webServer start it).
 */
test("register, sign out, sign back in", async ({ page }) => {
  const uniqueEmail = `owner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;

  await page.goto("/register");
  await page.getByLabel("Organization name").fill("Playwright Test Investments");
  await page.getByLabel("Your name").fill("Playwright Owner");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create organization" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  // Role query, not text: Next's route announcer can echo the same heading text for screen readers.
  await expect(page.getByRole("heading", { name: "Playwright Test Investments" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});
