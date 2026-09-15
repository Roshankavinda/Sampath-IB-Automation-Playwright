const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: History screens (Transaction / Bill Payment / Government Payment) — NEGATIVE.
 *   N01 no history listing shows a loading error
 *   N02 the dashboard's Recent Transactions tabs never render blank
 *   N03 history data is not exposed without a session
 */
const openTab = async (page, label) => {
  const tab = page.getByRole("button", { name: new RegExp(label, "i") }).first();
  if (!(await tab.isVisible().catch(() => false))) return false;
  await tab.click({ force: true }).catch(() => {});
  await page.waitForTimeout(4000);
  return true;
};

test.describe("History screens (View) - Negative & Validation", () => {
  test("TC_HIST_N01 - Verify that history listings show no loading error", async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.goToSavedBillers();
    await page.waitForTimeout(2500);
    await openTab(page, "bill payment history");

    const error = page
      .getByText(/error loading|failed to load|something went wrong|unable to load/i)
      .locator("visible=true")
      .first();
    await expect(error, "A history listing must not display a loading error").toBeHidden();
  });

  test("TC_HIST_N02 - Verify that Recent Transactions tabs never render blank", async ({ page, loggedInDashboard }) => {
    await expect(
      page.getByRole("heading", { name: /recent vishwa transactions/i }).first(),
      "The Recent Transactions section should be shown"
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });

    for (const tabName of ["Transfer", "Payment", "Mobile Cash"]) {
      const tab = page.getByRole("tab", { name: new RegExp(`^${tabName}$`, "i") }).first();
      if (!(await tab.isVisible().catch(() => false))) continue;
      await tab.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2500);

      const hasAmount = await page
        .getByText(/(lkr|usd)\s*-?[\d,]+\.\d{2}/i)
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      const empty = await page
        .getByText(/no .*(data|records|transactions|found)/i)
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      expect(
        hasAmount || empty,
        `The "${tabName}" Recent Transactions tab should show transactions or an explicit empty state`
      ).toBeTruthy();
    }
  });

  test("TC_HIST_N03 - Verify that history data is not exposed without a session", async ({ page }) => {
    await page.goto("/SVRClientWebV4/dashboard/sendmoney", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);
    const amount = await page
      .getByText(/(lkr|usd)\s*-?[\d,]+\.\d{2}/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(amount, "Transaction amounts must not be visible without a valid session").toBeFalsy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
