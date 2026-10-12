import { test, expect } from "@playwright/test";

/**
 * Phase 10 primary flow: create a public lead-capture form, submit it signed out on a phone-sized
 * screen, find the resulting lead, run and save a deal analysis on its property, and confirm the
 * lead shows on the Speed to Lead report as waiting for first contact. Uses the seeded demo owner
 * (`npm run db:seed`).
 */
test("lead form → lead → deal analyzer → speed to lead", async ({ page, browser, request }) => {
  const stamp = Date.now();
  const lastName = `Seller${stamp}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill("dana@fineline.demo");
  await page.getByLabel("Password").fill("DemoPass123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/settings/lead-forms");
  await page.getByLabel("Form name").fill(`E2E Form ${stamp}`);
  await page.getByLabel("Thank-you message (optional)").fill("Thanks — we'll call you today.");
  await page.getByRole("button", { name: "Create form" }).click();
  const formCard = page.locator("div", { hasText: `E2E Form ${stamp}` }).filter({ has: page.getByText("Copy link") }).last();
  const formUrl = (await formCard.locator("code").first().textContent())!.trim();
  expect(formUrl).toMatch(/\/f\/[\w-]{32}$/);

  const framed = await request.get(formUrl);
  expect(framed.headers()["x-frame-options"]).toBeUndefined();
  expect(framed.headers()["content-security-policy"]).toContain("frame-ancestors *");

  const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(formUrl);
  await expect(publicPage.getByRole("heading", { name: /cash offer/i })).toBeVisible();
  const overflow = await publicPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await publicPage.getByLabel("First name").fill("Pat");
  await publicPage.getByLabel("Last name").fill(lastName);
  await publicPage.getByLabel("Phone").fill(`555-${String(stamp).slice(-7)}`);
  await publicPage.getByLabel("Street address").fill(`${String(stamp).slice(-4)} E2E Lane`);
  await publicPage.getByLabel("City").fill("Austin");
  await publicPage.getByLabel("State").fill("TX");
  await publicPage.getByLabel("ZIP").fill("78701");
  await publicPage.getByLabel("Anything else we should know?").fill("Needs a new roof.");
  await publicPage.getByRole("button", { name: "Get my offer" }).click();
  await expect(publicPage.getByText("Thanks — we'll call you today.")).toBeVisible();
  await publicContext.close();

  await page.goto(`/search?q=${lastName}`);
  await page.getByRole("link", { name: new RegExp(lastName) }).first().click();
  await expect(page.getByText("Web form submissions")).toBeVisible();
  await expect(page.getByText("Needs a new roof.")).toBeVisible();

  await page.getByRole("link", { name: /E2E Lane/ }).click();
  await expect(page.getByText("Deal analyzer")).toBeVisible();
  await page.getByLabel("After-repair value (ARV)").fill("200000");
  await page.getByLabel("Repair cost").fill("30000");
  await page.getByLabel("Purchase price / offer").fill("100000");
  await page.getByLabel("Assignment fee").fill("10000");
  await expect(page.getByText("$110,000").first()).toBeVisible();
  await page.getByRole("button", { name: "Save analysis" }).click();
  await expect(page.getByText("Analysis saved.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("After-repair value (ARV)")).toHaveValue("200000");
  await expect(page.getByLabel("Purchase price / offer")).toHaveValue("100000");
  await expect(page.getByText("Not saved yet")).toHaveCount(0);

  await page.goto("/reports/speed-to-lead");
  await expect(page.getByText("Waiting on first contact")).toBeVisible();
  await expect(page.getByRole("link", { name: `Pat ${lastName}` })).toBeVisible();
});
