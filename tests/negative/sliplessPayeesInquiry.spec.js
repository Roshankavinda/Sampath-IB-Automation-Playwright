const { test, expect } = require("../../utils/fixtures");
const { SliplessPage } = require("../../pages/SliplessPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Slipless - My Payees & Inquiry — NEGATIVE / VALIDATION.
 *   N06 the Inquiry list must not show a backend loading error
 *   N07 the My Payees list never renders blank (payees or an explicit empty state)
 *   N08 searching inquiries for an unknown term returns nothing
 *
 * !! LIVE FINDING !! N06 currently FAILS: the Inquiry tab shows "Error loading data".
 */
test.describe("Slipless - My Payees & Inquiry - Negative & Validation", () => {
  async function open(page, loggedInDashboard) {
    const sl = new SliplessPage(page);
    await loggedInDashboard.goToSlipless();
    await sl.assertLoaded();
    return sl;
  }

  test("TC_SLIP_N06 - Verify that the Inquiry tab shows no loading error", async ({ page, loggedInDashboard }) => {
    const sl = await open(page, loggedInDashboard);
    await sl.openInquiry();
    const state = await sl.readListState(sl.inquiryRows);
    expect(
      state.error,
      "APP DEFECT: the Inquiry tab shows 'Error loading data' instead of the inquiries list"
    ).toBeFalsy();
  });

  test("TC_SLIP_N07 - Verify that the My Payees list never renders blank", async ({ page, loggedInDashboard }) => {
    const sl = await open(page, loggedInDashboard);
    await sl.openMyPayees();
    const state = await sl.readListState(sl.payeeRows);
    // A genuinely empty payee list is acceptable ONLY with an explicit empty state or the
    // Add New Payee call-to-action still present - never a blank/broken panel.
    const cta = await sl.addNewPayeeButton.isVisible().catch(() => false);
    expect(
      state.rows > 0 || state.empty || cta,
      "My Payees should list payees, show an empty state, or at least offer Add New Payee"
    ).toBeTruthy();
    expect(state.error, "The My Payees list must not show a loading error").toBeFalsy();
  });

  test("TC_SLIP_N08 - Verify that searching inquiries for an unknown term returns nothing", async ({
    page,
    loggedInDashboard,
  }) => {
    const sl = await open(page, loggedInDashboard);
    await sl.openInquiry();
    test.skip(await sl.errorState.isVisible().catch(() => false), "The Inquiry list is in an error state - search cannot be exercised.");

    await sl.inquirySearch.fill("zzz_no_such_inquiry_zzz");
    await page.waitForTimeout(3000);
    const state = await sl.readListState(sl.inquiryRows);
    expect(state.rows === 0 || state.empty, "An unknown inquiry search should return no rows").toBeTruthy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
