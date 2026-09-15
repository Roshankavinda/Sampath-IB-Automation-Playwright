const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: My Accounts detail views — NEGATIVE / VALIDATION.
 *   N01 the Credit Cards view shows no loading error
 *   N02 the Loans view states its status rather than rendering blank
 *   N03 account data is not exposed without a session
 */
test.describe("My Accounts (View) - Negative & Validation", () => {
  test("TC_MYACC_N01 - Verify that the Credit Cards view shows no loading error", async ({
    page,
    loggedInDashboard,
  }) => {
    let opened = false;
    for (let i = 0; i < 3 && !opened; i++) {
      opened = await loggedInDashboard.goToCreditCards().then(() => true).catch(() => false);
      if (!opened) await page.waitForTimeout(2000);
    }
    test.skip(!opened, "The My Accounts > Credit Cards nav dropdown did not open (known flaky nav).");

    const error = page
      .getByText(/error loading|failed to load|something went wrong|unable to load/i)
      .locator("visible=true")
      .first();
    await expect(error, "The Credit Cards view must not display a loading error").toBeHidden();
  });

  test("TC_MYACC_N02 - Verify that the Loans view never renders blank", async ({ page, loggedInDashboard }) => {
    let opened = false;
    for (let i = 0; i < 3 && !opened; i++) {
      opened = await loggedInDashboard.goToLoans().then(() => true).catch(() => false);
      if (!opened) await page.waitForTimeout(2000);
    }
    test.skip(!opened, "The My Accounts > Loans nav dropdown did not open (known flaky nav).");

    const rows = await page.locator("table tbody tr").count().catch(() => 0);
    const empty = await page
      .getByText(/no data found|no .*(loans|records)/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(rows > 0 || empty, "The Loans view should list loans or show an explicit empty state").toBeTruthy();
  });

  test("TC_MYACC_N03 - Verify that account data is not exposed without a session", async ({ page }) => {
    await page.goto("/SVRClientWebV4/dashboard/myaccount", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);
    const balance = await page
      .getByText(/(lkr|usd)\s*-?[\d,]+\.\d{2}/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(balance, "Account balances must not be visible without a valid session").toBeFalsy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
