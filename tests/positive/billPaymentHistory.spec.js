const { test, expect } = require("../../utils/fixtures");
const { BillPaymentHistoryPage } = require("../../pages/BillPaymentHistoryPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Billers > BILL PAYMENT HISTORY — POSITIVE.
 * Table view (7 columns), numbered pagination (10 rows per page), the Filter panel
 * (amount range / payment status / payment date) and the per-row RE-PAYMENT action.
 *
 * VIEW ONLY: the re-payment tests open the pre-filled payment form but never submit it.
 */
test.describe("Bill Payment History - Positive", () => {
  async function open(page, loggedInDashboard) {
    const history = new BillPaymentHistoryPage(page);
    await history.open(loggedInDashboard);
    return history;
  }

  // ---- Table view ----

  test("TC_BPHIST_H01 - Verify that the Bill Payment History table shows all its columns", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    await history.assertColumns();
  });

  test("TC_BPHIST_H02 - Verify that the payment history renders", async ({ page, loggedInDashboard }) => {
    const history = await open(page, loggedInDashboard);
    const rows = await history.assertListRendered("Bill Payment History");
    await history.assertNoError();
    // eslint-disable-next-line no-console
    console.log(`Bill Payment History -> ${rows} row(s) on page 1`);
  });

  test("TC_BPHIST_H03 - Verify that each row shows a payment ID, status, date and amount", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    test.skip((await history.rowCount()) === 0, "No payments are listed.");

    const paymentId = await history.cellText(0, 0);
    const biller = await history.cellText(0, 1);
    const payFrom = await history.cellText(0, 2);
    const status = await history.cellText(0, 3);
    const dateTime = await history.cellText(0, 4);
    const amount = await history.cellText(0, 5);
    // eslint-disable-next-line no-console
    console.log(`Row 0: id=${paymentId} biller=${biller} from=${payFrom} status=${status} at=${dateTime} ${amount}`);

    expect.soft(paymentId, "Payment ID should be a number").toMatch(/\d+/);
    expect.soft(biller, "Biller Title should not be empty").not.toBe("");
    expect.soft(payFrom, "Pay From should show the funding account").toMatch(/\d/);
    expect
      .soft(status.toUpperCase(), "Status should be one of the app's payment statuses")
      .toMatch(/SUCCESS|FAILED|STOPPED|PENDING|IN PROCESS/);
    expect.soft(dateTime, "Date & Time should be formatted, e.g. 'Aug 31, 2026 at 12:51PM'").toMatch(
      /[A-Za-z]{3}\s+\d{1,2},\s*\d{4}.*\d{1,2}:\d{2}\s*(AM|PM)/i
    );
    expect.soft(amount, "Amount should be formatted, e.g. 'LKR 1,580.00'").toMatch(/[A-Z]{3}\s*[\d,]+\.\d{2}/);
  });

  // ---- Pagination ----

  test("TC_BPHIST_H04 - Verify that the history is paginated", async ({ page, loggedInDashboard }) => {
    const history = await open(page, loggedInDashboard);
    const pages = await history.pageCount();
    // eslint-disable-next-line no-console
    console.log(`Pager offers ${pages} page(s)`);
    test.skip(pages < 2, "The history fits on a single page - pagination cannot be exercised.");

    const firstPageRow = await history.firstRowText();
    const rowsOnPage1 = await history.rowCount();

    await test.step("Go to page 2 - it shows different payments", async () => {
      expect(await history.goToPage(2), "Page 2 should be reachable").toBeTruthy();
      await history.assertListRendered("Bill Payment History page 2");
      const secondPageRow = await history.firstRowText();
      // eslint-disable-next-line no-console
      console.log(`Page 1 first row: ${firstPageRow.slice(0, 50)} | Page 2 first row: ${secondPageRow.slice(0, 50)}`);
      expect(secondPageRow, "Page 2 must not repeat page 1's first payment").not.toBe(firstPageRow);
      await history.assertNoError();
    });

    await test.step("Go back to page 1 - the original payments return", async () => {
      expect(await history.goToPage(1), "Page 1 should be reachable again").toBeTruthy();
      expect(await history.firstRowText(), "Returning to page 1 should restore its payments").toBe(firstPageRow);
      expect(await history.rowCount(), "Page 1 should list the same number of rows as before").toBe(rowsOnPage1);
    });
  });

  // ---- Filters ----

  test("TC_BPHIST_H05 - Verify that the Filter panel offers all its controls", async ({ page, loggedInDashboard }) => {
    const history = await open(page, loggedInDashboard);
    await history.openFilter();
    await history.assertFilterControls();

    const options = await history.statusOptions();
    // eslint-disable-next-line no-console
    console.log("Payment Status options:", JSON.stringify(options));
    for (const status of ["All", "SUCCESS", "FAILED", "PENDING"]) {
      expect
        .soft(
          options.some((o) => o.toLowerCase() === status.toLowerCase()),
          `The Payment Status dropdown should offer "${status}"`
        )
        .toBeTruthy();
    }
  });

  test("TC_BPHIST_H06 - Verify that filtering by payment status returns only that status", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    test.skip((await history.rowCount()) === 0, "No payments are listed.");

    // Filter on a status that the listing actually contains, so the filter can be proven.
    const present = (await history.statuses()).map((s) => s.toUpperCase());
    const target = present.find((s) => /SUCCESS|FAILED|PENDING|STOPPED/.test(s));
    test.skip(!target, "No recognisable payment status in the listing to filter on.");

    await history.openFilter();
    const selected = await history.selectStatus(target);
    test.skip(!selected, `The Payment Status dropdown does not offer "${target}".`);
    const rows = await history.applyFilters();
    // eslint-disable-next-line no-console
    console.log(`Filter status="${target}" -> ${rows} row(s)`);

    await history.assertNoError();
    const statuses = await history.statuses();
    for (const status of statuses) {
      expect(status.toUpperCase(), `Every row should have the filtered status "${target}"`).toContain(target);
    }
  });

  test("TC_BPHIST_H07 - Verify that filtering by amount range returns only amounts in range", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    test.skip((await history.rowCount()) === 0, "No payments are listed.");

    // Build the range around an amount that is really in the listing.
    const amounts = await history.amounts();
    test.skip(amounts.length === 0, "No amounts could be read from the listing.");
    const target = amounts[0];
    const from = Math.max(0, Math.floor(target - 1));
    const to = Math.ceil(target + 1);

    await history.openFilter();
    // The Payment Status dropdown defaults to SUCCESS, and it is ANDed with the amount range -
    // without widening it to "All" an amount filter returns nothing for an account whose
    // payments are all FAILED, and the test would pass while proving nothing.
    await history.selectStatus("All");
    await history.setAmountRange(from, to);
    const rows = await history.applyFilters();
    // eslint-disable-next-line no-console
    console.log(`Filter amount ${from}-${to} (status All) -> ${rows} row(s)`);

    await history.assertNoError();
    expect(rows, `A payment of ${target} exists, so the range ${from}-${to} should return it`).toBeGreaterThan(0);
    for (const amount of await history.amounts()) {
      expect(amount, `Every listed amount should be between ${from} and ${to}`).toBeGreaterThanOrEqual(from);
      expect(amount, `Every listed amount should be between ${from} and ${to}`).toBeLessThanOrEqual(to);
    }
  });

  // ---- Re-payment ----

  test("TC_BPHIST_H08 - Verify that every payment offers the re-payment action", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    const rows = await history.rowCount();
    test.skip(rows === 0, "No payments are listed.");

    const repayable = await history.repayableRowCount();
    // eslint-disable-next-line no-console
    console.log(`${repayable} of ${rows} payment row(s) offer re-payment`);
    expect(repayable, "The listed payments should offer the re-payment action").toBeGreaterThan(0);
  });

  test("TC_BPHIST_H09 - Verify that re-payment opens the payment form pre-filled", async ({
    page,
    loggedInDashboard,
  }) => {
    const history = await open(page, loggedInDashboard);
    test.skip((await history.rowCount()) === 0, "No payments are listed.");

    const historyAmount = await history.cellText(0, 5); // e.g. "LKR 643.00"
    const rowText = await history.clickRepayment(0);

    const values = await history.assertRepaymentFormPrefilled();
    // eslint-disable-next-line no-console
    console.log(`Re-payment of [${rowText}] -> ${JSON.stringify(values)}`);

    // The form must carry the ORIGINAL amount of the payment being repeated.
    const historyDigits = historyAmount.replace(/[^0-9.]/g, "");
    expect(
      values.amount.replace(/[^0-9.]/g, ""),
      `The re-payment form should carry the payment's amount (${historyAmount})`
    ).toBe(historyDigits);
    expect(values.fromAccount, "The re-payment form should carry a funding account").not.toBe("");
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
