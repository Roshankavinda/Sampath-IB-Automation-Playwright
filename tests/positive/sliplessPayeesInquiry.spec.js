const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { SliplessPage } = require("../../pages/SliplessPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Slipless Banking - MY PAYEES and INQUIRY tabs — POSITIVE.
 * Slipless has four tabs: Cash Deposit | Cash Withdrawal | My Payees | Inquiry.
 * Deposit (Own / Other Accounts) and Withdrawal are covered by slipless.spec.js and
 * sliplessOtherAccount.spec.js; this spec covers the remaining two tabs.
 *
 *   My Payees : "Saved Payees / Manage your all time saved payees." + "Add New Payee".
 *   Inquiry   : "Inquiries / View all slipless inquiries." + Filters + Search.
 */
test.describe("Slipless - My Payees & Inquiry - Positive", () => {
  async function open(page, loggedInDashboard) {
    const sl = new SliplessPage(page);
    await loggedInDashboard.goToSlipless();
    await sl.assertLoaded();
    return sl;
  }

  test("TC_SLIP_H04 - Verify that all four Slipless tabs are offered", async ({ page, loggedInDashboard }) => {
    const sl = await open(page, loggedInDashboard);
    await expect(sl.cashDepositTab, "'Cash Deposit' tab should be offered").toBeVisible();
    await expect(sl.cashWithdrawalTab, "'Cash Withdrawal' tab should be offered").toBeVisible();
    await expect(sl.myPayeesTab, "'My Payees' tab should be offered").toBeVisible();
    await expect(sl.inquiryTab, "'Inquiry' tab should be offered").toBeVisible();
  });

  test("TC_SLIP_H05 - Verify that the My Payees tab shows the saved payees section", async ({
    page,
    loggedInDashboard,
  }) => {
    const sl = await open(page, loggedInDashboard);
    await sl.openMyPayees();
    await expect(sl.addNewPayeeButton, "'Add New Payee' should be offered on My Payees").toBeVisible();

    const state = await sl.readListState(sl.payeeRows);
    // eslint-disable-next-line no-console
    console.log(`Slipless My Payees: rows=${state.rows} empty=${state.empty} error=${state.error}`);
    expect(state.error, "The My Payees list must not show a loading error").toBeFalsy();
  });

  test("TC_SLIP_H06 - Verify that Add New Payee opens the add-payee flow", async ({ page, loggedInDashboard }) => {
    const sl = await open(page, loggedInDashboard);
    await sl.openMyPayees();
    await expect(sl.addNewPayeeButton).toBeVisible();

    await test.step("Click Add New Payee once it enables", async () => {
      // The button is DISABLED while the payee list loads - wait for it to enable rather
      // than force-clicking a disabled control (which does nothing).
      await expect(sl.addNewPayeeButton, "Add New Payee should enable once the list has loaded").toBeEnabled({
        timeout: TIMEOUTS.LOAD,
      });
      const before = page.url();
      await sl.addNewPayeeButton.click();
      await page.waitForTimeout(4000);

      const formShown = await page
        .locator("input, select")
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      const navigated = page.url() !== before;
      // eslint-disable-next-line no-console
      console.log(`Add New Payee -> url=${page.url().replace(/.*SVRClientWebV4/, "")} form=${formShown}`);
      expect(formShown || navigated, "Add New Payee should open an add-payee form or page").toBeTruthy();
    });
  });

  test("TC_SLIP_H07 - Verify that the Inquiry tab shows the inquiries view with its controls", async ({
    page,
    loggedInDashboard,
  }) => {
    const sl = await open(page, loggedInDashboard);
    await sl.openInquiry();
    await expect(sl.filtersButton, "A Filters control should be offered on Inquiry").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(sl.inquirySearch, "A Search box should be offered on Inquiry").toBeVisible();
    await expect.soft(sl.recentSlipsPanel, "The 'Recently Generated Deposit Slips' panel should be shown").toBeVisible();
  });

  test("TC_SLIP_H08 - Verify that the Inquiry list renders all details", async ({ page, loggedInDashboard }) => {
    const sl = await open(page, loggedInDashboard);
    await sl.openInquiry();

    const state = await sl.readListState(sl.inquiryRows);
    // eslint-disable-next-line no-console
    console.log(`Slipless Inquiry: rows=${state.rows} empty=${state.empty} error=${state.error}`);
    expect(state.error, "The Inquiry list must not show 'Error loading data'").toBeFalsy();
    expect(state.rows > 0 || state.empty, "The Inquiry list should show inquiries or an explicit empty state").toBeTruthy();

    if (state.rows > 0) {
      const cols = (await page.getByRole("columnheader").allInnerTexts().catch(() => [])).filter(Boolean);
      // eslint-disable-next-line no-console
      console.log(`Inquiry columns: ${JSON.stringify(cols)}`);
      expect(cols.length, "The Inquiry table should show its columns").toBeGreaterThan(0);
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
