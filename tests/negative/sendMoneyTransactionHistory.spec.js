const { test, expect } = require("../../utils/fixtures");
const { TransactionHistoryPage } = require("../../pages/TransactionHistoryPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Send Money > Transaction History — NEGATIVE / VALIDATION.
 *   N01 the listing shows no loading error
 *   N02 the table never renders blank (rows or an explicit empty state) on either sub-tab
 *   N03 amounts and dates are properly formatted (no NaN / Invalid Date placeholders)
 */
test.describe("Send Money - Transaction History - Negative & Validation", () => {
  test("TC_TXNH_N01 - Verify that Transaction History shows no loading error", async ({ page, loggedInDashboard }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    await txn.assertNoError();
  });

  test("TC_TXNH_N02 - Verify that neither sub-tab renders a blank table", async ({ page, loggedInDashboard }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    for (const tab of ["Fund Transfer", "Mobile Cash"]) {
      const switched = await txn.switchTab(tab);
      if (!switched) continue;
      await txn.assertListRendered(tab);
    }
  });

  test("TC_TXNH_N03 - Verify that amounts and dates are properly formatted", async ({ page, loggedInDashboard }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    const rows = await txn.assertListRendered("Fund Transfer");
    test.skip(rows === 0, "No transactions listed - formatting cannot be checked.");

    const text = (await txn.rows.first().innerText().catch(() => "")) || "";
    expect(text, "A transaction row should show a formatted currency amount").toMatch(/(LKR|USD)\s*[\d,]+\.\d{2}/i);
    expect(text, "A transaction row must not show NaN/undefined/Invalid Date").not.toMatch(
      /nan|undefined|null|invalid date/i
    );
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
