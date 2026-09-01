const { test, expect } = require("../../utils/fixtures");
const { BillPaymentHistoryPage } = require("../../pages/BillPaymentHistoryPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Billers > Bill Payment History — NEGATIVE / VALIDATION.
 *   N01 the listing never renders a blank panel or a loading error
 *   N02 a page never renders more than the page size (10)
 *   N03 an impossible amount range returns no payments (and says so)
 *   N04 an inverted amount range (From > To) does not return everything
 *   N05 re-payment does NOT repeat the payment on its own - the reference must be re-entered
 *   N06 the Old Vishwa history is offered as a separate, explicit action
 *
 * VIEW ONLY: nothing is ever submitted.
 */
test.describe("Bill Payment History - Negative & Validation", () => {
  async function open(page, loggedInDashboard) {
    const history = new BillPaymentHistoryPage(page);
    await history.open(loggedInDashboard);
    return history;
  }

  test("TC_BPHIST_N01 - Verify that the history never renders a blank panel", async ({ page, loggedInDashboard }) => {
    const history = await open(page, loggedInDashboard);
    await history.assertListRendered("Bill Payment History");
    await history.assertNoError();
  });

  test("TC_BPHIST_N02 - Verify that a page never exceeds the page size", async ({ page, loggedInDashboard }) => {
    const history = await open(page, loggedInDashboard);
    const rows = await history.rowCount();
    expect(rows, `A history page must not render more than 10 payments (rendered ${rows})`).toBeLessThanOrEqual(10);

    if (await history.goToPage(2)) {
      const page2 = await history.rowCount();
      expect(page2, `Page 2 must not render more than 10 payments (rendered ${page2})`).toBeLessThanOrEqual(10);
    }
  });

  test("TC_BPHIST_N03 - Verify that an impossible amount range returns no payments", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    await history.openFilter();
    // Widen the status (it defaults to SUCCESS) so the empty result is caused by the amount
    // range under test and not by the status filter.
    await history.selectStatus("All");
    // A range no real payment can fall into.
    await history.setAmountRange(99999990, 99999999);
    const rows = await history.applyFilters();

    const empty = await history.emptyState.isVisible().catch(() => false);
    expect(rows === 0 || empty, "An impossible amount range should return no payments").toBeTruthy();
    await history.assertNoError();
  });

  test("TC_BPHIST_N04 - Verify that an inverted amount range is rejected", async ({ page, loggedInDashboard }) => {
    const history = await open(page, loggedInDashboard);
    const before = await history.rowCount();
    test.skip(before === 0, "No payments are listed.");
    const firstBefore = await history.firstRowText();

    await history.openFilter();
    // From is GREATER than To - the app rejects this with "From amount should be less than
    // To amount." and leaves the listing alone.
    await history.setAmountRange(9000, 10);
    await history.applyFilters();

    await expect(
      history.filterValidation,
      "An inverted amount range should be rejected with a validation message"
    ).toBeVisible();
    expect(await history.firstRowText(), "A rejected filter must leave the listing unchanged").toBe(firstBefore);
    await history.assertNoError();
  });

  test("TC_BPHIST_N05 - Verify that re-payment does not repeat the payment by itself", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    test.skip((await history.rowCount()) === 0, "No payments are listed.");

    await history.clickRepayment(0);
    const values = await history.assertRepaymentFormPrefilled();

    // The biller reference and its re-enter twin must be EMPTY, so the user has to retype
    // them - a re-payment can never be one click away from executing.
    expect(values.reference, "The biller reference must not be pre-filled by a re-payment").toBe("");
    expect(values.reEnter, "The re-enter reference must not be pre-filled by a re-payment").toBe("");

    // And nothing may have been submitted: no OTP popup, no success message.
    const otp = await page.locator("input.otp-box").first().isVisible().catch(() => false);
    expect(otp, "Clicking re-payment must not submit the payment (no OTP popup should appear)").toBeFalsy();
  });

  test("TC_BPHIST_N06 - Verify that Old Vishwa history is a separate explicit action", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    const offered = await history.loadOldVishwaButton.isVisible().catch(() => false);
    test.skip(!offered, "This build does not offer 'Load Old Vishwa History'.");

    await expect
      .soft(history.oldVishwaNote, "The screen should state it is showing New Vishwa payments")
      .toBeVisible();
    await expect
      .soft(history.loadOldVishwaButton, "Old Vishwa history should need an explicit action to load")
      .toBeVisible();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
