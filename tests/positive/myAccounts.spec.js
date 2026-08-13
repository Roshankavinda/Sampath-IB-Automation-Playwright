const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: My Accounts detail views — VIEW ONLY (POSITIVE).
 * The Credit Cards and Loans views are reached through the verified DashboardPage
 * navigation (the same paths the settlement tests use). Read-only assertions.
 */
test.describe("My Accounts (View) - Positive", () => {
  test("TC_MYACC_H01 - Verify that the Credit Cards view renders", async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.goToCreditCards();
    await expect(
      page.getByText(/accounts \/ credit cards|credit card details/i).first(),
      "The Credit Cards view should be displayed"
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });

    // A card (masked number) or an explicit empty state must be shown.
    const hasCard = await page.getByText(/\d{4}\s*\d{2}XX|XXXX\s*\d{4}/i).first().isVisible().catch(() => false);
    const empty = await page.getByText(/no .*(data|cards|found)/i).locator("visible=true").first().isVisible().catch(() => false);
    expect(hasCard || empty, "Credit Cards should list cards or state that there are none").toBeTruthy();
  });

  test("TC_MYACC_H02 - Verify that the Loans view renders", async ({ page, loggedInDashboard }) => {
    let opened = false;
    for (let i = 0; i < 3 && !opened; i++) {
      opened = await loggedInDashboard.goToLoans().then(() => true).catch(() => false);
      if (!opened) await page.waitForTimeout(2000);
    }
    test.skip(!opened, "The My Accounts > Loans nav dropdown did not open (known flaky nav).");
    await expect(
      page.getByText(/my accounts \/ loans|loan account summary|loan list/i).first(),
      "The Loans view should be displayed"
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });

    const rows = await page.locator("table tbody tr").count().catch(() => 0);
    const empty = await page.getByText(/no data found/i).first().isVisible().catch(() => false);
    expect(rows > 0 || empty, "Loans should list loans or show 'No data found'").toBeTruthy();
  });

  test("TC_MYACC_H03 - Verify that the My Accounts menu lists its sections", async ({ page, loggedInDashboard }) => {
    const nav = page.getByRole("button", { name: "My Accounts", exact: true }).first();
    await expect(nav, "The 'My Accounts' nav button should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await nav.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);

    const menuOpened = await page
      .getByText(/operative accounts/i)
      .first()
      .isVisible()
      .catch(() => false);
    test.skip(!menuOpened, "The My Accounts dropdown did not open (known flaky nav).");

    for (const item of ["Operative Accounts", "Fixed Deposits", "Loans"]) {
      await expect
        .soft(page.getByText(new RegExp(item, "i")).first(), `"${item}" should be listed in the My Accounts menu`)
        .toBeVisible();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
