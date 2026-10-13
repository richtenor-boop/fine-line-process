import { test, expect } from "@playwright/test";

/**
 * Phase 11: Podio-style lead views, picture links, deal evaluator → contract generator.
 * Uses the seeded demo owner (`npm run db:seed`).
 */
test("lead views, picture link, evaluator, and contract generation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("dana@fineline.demo");
  await page.getByLabel("Password").fill("DemoPass123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/leads");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Badge" })).toHaveAttribute("aria-current", "page");
  for (const view of ["Table", "Activity", "Calendar"]) {
    await main.getByRole("link", { name: view, exact: true }).click();
    await expect(main.getByRole("link", { name: view, exact: true })).toHaveAttribute("aria-current", "page");
  }

  await page.goto("/properties");
  await page.locator("a[href^='/properties/c']").first().click();
  await expect(page.getByRole("heading", { name: "Pictures & links" })).toBeVisible();

  const label = `E2E photos ${Date.now()}`;
  const addAnother = page.getByRole("button", { name: "Add another" });
  if (await addAnother.isVisible()) await addAnother.click();
  await page.getByLabel("Link", { exact: true }).fill("https://www.dropbox.com/scl/fo/e2e/photos");
  await page.getByLabel("Label").fill(label);
  await page.getByRole("button", { name: "Save link" }).click();
  await expect(page.getByRole("link", { name: new RegExp(label) })).toBeVisible();

  await page.getByLabel("After-repair value (ARV)").fill("200000");
  await page.getByLabel("Repair cost").fill("30000");
  await page.getByLabel("Seller's asking price").fill("95000");
  await page.getByLabel("Existing loan balance").fill("40000");
  await expect(page.getByText("Best fit:")).toContainText("Cash offer");

  await page.getByRole("link", { name: /Generate cash offer contract/ }).click();
  await expect(page).toHaveURL(/contracts\/new\?type=CASH/);
  await expect(page.getByLabel("Purchase price ($)")).not.toHaveValue("");
  await page.getByLabel("Seller name(s)").fill("E2E Seller");
  await page.getByLabel("Closing attorney / title company").fill("E2E Title LLC");
  await page.getByRole("button", { name: "Generate Cash Purchase Agreement" }).click();

  await expect(page).toHaveURL(/\/contracts\/c/);
  await expect(page.getByRole("heading", { name: "Cash Purchase Agreement" })).toBeVisible();
  await expect(page.getByText("DRAFT — NOT LEGAL ADVICE")).toBeVisible();
  await expect(page.getByText("E2E Title LLC").first()).toBeVisible();
});
