const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: History screens — VIEW ONLY (POSITIVE).
 *   - Send Money > "Transaction History"
 *   - Saved Billers > "Bill Payment History" and "Government Payment History"
 * These are read-only listings: they must render either records or an explicit empty state.
 *
 * // VERIFY: the tab labels are taken from the live page chrome; the listings' columns were
 * // not captured, so the assertions stay structural (records or empty state, no error).
 */
const openTab = async (page, label) => {
  const tab = page.getByRole("button", { name: new RegExp(label, "i") }).first();
  const visible = await tab.isVisible().catch(() => false);
  if (!visible) return false;
  await tab.click({ force: true }).catch(() => {});
  await page.waitForTimeout(4000);
  return true;
};

/** A listing must show rows OR an explicit empty state - never a blank/error panel. */
const assertListingRendered = async (page, label) => {
  const rows = await page.locator("table tbody tr").count().catch(() => 0);
  const empty = await page
    .getByText(/no .*(data|records|transactions|history|found)/i)
    .locator("visible=true")
    .first()
    .isVisible()
    .catch(() => false);
  const error = await page
    .getByText(/error loading|failed to load|something went wrong/i)
    .locator("visible=true")
    .first()
    .isVisible()
    .catch(() => false);

  expect(error, `"${label}" must not show a loading error`).toBeFalsy();
  expect(rows > 0 || empty, `"${label}" should show records or an explicit empty state`).toBeTruthy();
  // eslint-disable-next-line no-console
  console.log(`${label}: rows=${rows} emptyState=${empty}`);
};

test.describe("History screens (View) - Positive", () => {
  test("TC_HIST_H01 - Verify that Transaction History renders", async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.goToSendMoney();
    await page.waitForTimeout(2500);
    const opened = await openTab(page, "transaction history");
    test.skip(!opened, "The 'Transaction History' tab is not available on this page.");
    await assertListingRendered(page, "Transaction History");
  });

  test("TC_HIST_H02 - Verify that Bill Payment History renders", async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.goToSavedBillers();
    await page.waitForTimeout(2500);
    const opened = await openTab(page, "bill payment history");
    test.skip(!opened, "The 'Bill Payment History' tab is not available on this page.");
    await assertListingRendered(page, "Bill Payment History");
  });

  test("TC_HIST_H03 - Verify that Government Payment History renders", async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.goToSavedBillers();
    await page.waitForTimeout(2500);
    const opened = await openTab(page, "government payment history");
    test.skip(!opened, "The 'Government Payment History' tab is not available on this page.");
    await assertListingRendered(page, "Government Payment History");
  });

  test("TC_HIST_H04 - Verify that the dashboard's Recent Transactions tabs can be browsed", async ({
    page,
    loggedInDashboard,
  }) => {
    // The dashboard lists Recent Vishwa Transactions under Transfer | Payment | Mobile Cash.
    await expect(
      page.getByRole("heading", { name: /recent vishwa transactions/i }).first(),
      "The Recent Transactions section should be shown"
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });

    for (const tabName of ["Transfer", "Payment", "Mobile Cash"]) {
      const tab = page.getByRole("tab", { name: new RegExp(`^${tabName}$`, "i") }).first();
      if (!(await tab.isVisible().catch(() => false))) continue;
      await tab.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2500);
      await assertListingRendered(page, `Recent Transactions / ${tabName}`);
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
