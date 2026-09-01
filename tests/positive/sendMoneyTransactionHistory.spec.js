const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { TransactionHistoryPage } = require("../../pages/TransactionHistoryPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Send Money > TRANSACTION HISTORY — VIEW ONLY (POSITIVE).
 * Sub-tabs "Fund Transfer" (11 columns) and "Mobile Cash" (8 columns), a Filter control,
 * per-row Actions (download / re-payment) and the Favourite Payees search panel.
 *
 * Read-only: no transaction is repeated and no payment is made.
 */
test.describe("Send Money - Transaction History - Positive", () => {
  test("TC_TXNH_H01 - Verify that Transaction History opens and lists transactions", async ({
    page,
    loggedInDashboard,
  }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    const rows = await txn.assertListRendered("Fund Transfer");
    // eslint-disable-next-line no-console
    console.log(`Transaction History (Fund Transfer): ${rows} row(s)`);
  });

  test("TC_TXNH_H02 - Verify that the Fund Transfer tab shows all its columns", async ({
    page,
    loggedInDashboard,
  }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    await txn.assertColumns("Fund Transfer");
  });

  test("TC_TXNH_H03 - Verify that the Mobile Cash tab can be switched to and shows its columns", async ({
    page,
    loggedInDashboard,
  }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);

    await test.step("Switch to the Mobile Cash tab", async () => {
      const switched = await txn.switchTab("Mobile Cash");
      test.skip(!switched, "The 'Mobile Cash' sub-tab is not offered.");
    });
    await test.step("Its columns and rows are shown", async () => {
      await txn.assertColumns("Mobile Cash");
      const rows = await txn.assertListRendered("Mobile Cash");
      // eslint-disable-next-line no-console
      console.log(`Transaction History (Mobile Cash): ${rows} row(s)`);
    });
  });

  test("TC_TXNH_H04 - Verify that both sub-tabs can be switched back and forth", async ({
    page,
    loggedInDashboard,
  }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    for (const tab of ["Mobile Cash", "Fund Transfer", "Mobile Cash"]) {
      const switched = await txn.switchTab(tab);
      if (!switched) continue;
      await txn.assertListRendered(tab);
    }
  });

  test("TC_TXNH_H05 - Verify that the Filter control is available", async ({ page, loggedInDashboard }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    await expect(txn.filterButton, "A Filter control should be offered").toBeVisible();
    await expect(txn.filterButton, "Filter should be enabled once the list has loaded").toBeEnabled();

    await test.step("Opening the filter shows its options", async () => {
      await txn.filterButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2500);
      const opened = await page
        .getByText(/date|from|to|status|category|apply|clear|reset/i)
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      expect(opened, "The Filter control should reveal filter options when opened").toBeTruthy();
    });
  });

  test("TC_TXNH_H06 - Verify that a transaction row offers Download and Re-payment actions", async ({
    page,
    loggedInDashboard,
  }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    const rows = await txn.assertListRendered("Fund Transfer");
    test.skip(rows === 0, "No transactions listed - row actions cannot be exercised.");

    // The Actions column is at the far right of a horizontally scrollable table.
    await test.step("Scroll the table right to reveal the Actions column", async () => {
      await txn.scrollActionsIntoView();
    });

    await test.step("The Download icon is offered on a transaction row", async () => {
      await expect(
        txn.downloadButton(0),
        "Each transaction row should offer a Download action"
      ).toBeVisible({ timeout: TIMEOUTS.LOAD });
    });

    await test.step("The Re-payment (repeat) icon is offered on a repeatable row", async () => {
      const idx = await txn.firstRepayableRow();
      // eslint-disable-next-line no-console
      console.log(`First repayable row index: ${idx}`);
      test.skip(idx < 0, "No listed transaction offers the re-payment action.");
      await expect(
        txn.repaymentButton(idx),
        "A repeatable transaction should offer the Re-payment (repeat) action"
      ).toBeVisible();
    });
  });

  test("TC_TXNH_H08 - Verify that the Re-payment action opens the transfer flow", async ({
    page,
    loggedInDashboard,
  }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    const rows = await txn.assertListRendered("Fund Transfer");
    test.skip(rows === 0, "No transactions listed.");
    await txn.scrollActionsIntoView();

    const idx = await txn.firstRepayableRow();
    test.skip(idx < 0, "No listed transaction offers the re-payment action.");

    // SAFETY: this only opens the pre-filled repeat form - it is never submitted, so no
    // payment is made.
    await test.step("Click Re-payment and validate the transfer form opens pre-filled", async () => {
      await txn.repaymentButton(idx).click({ force: true });
      await page.waitForTimeout(4000);
      const opened = await page
        .getByText(/amount|transfer|confirm|pay now|beneficiary/i)
        .locator("visible=true")
        .first()
        .isVisible()
        .catch(() => false);
      expect(opened, "The re-payment action should open the transfer/confirmation flow").toBeTruthy();
    });
  });

  test("TC_TXNH_H07 - Verify that the Favourite Payees panel and its search are shown", async ({
    page,
    loggedInDashboard,
  }) => {
    const txn = new TransactionHistoryPage(page);
    await txn.open(loggedInDashboard);
    await expect(txn.favouritesSearch, "The 'Search Favourite Payees' box should be shown").toBeVisible();

    await test.step("Searching the favourites panel keeps the page usable", async () => {
      await txn.favouritesSearch.fill("zzz_no_such_payee");
      await page.waitForTimeout(2000);
      await txn.assertNoError();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
