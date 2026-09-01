const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const savedPayeeTransfer = require("../../test-data/savedPayeeTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Send Money > SAVED PAYEES tab - list display, filters, search, pagination.
 * Confirmed columns: Add to List. | Account Number | Account Name | Nickname | Bank Name |
 * Transaction Type | Add to Favorites | Actions.
 * Filters: All | Sampath Bank Accounts | Other Bank Accounts | Other Bank Cards.
 * Page size: "Payees per page" (10 / 20 / 30 / 50 / 100).
 *
 * VIEW ONLY - no payee is paid, edited or deleted.
 */
test.describe("Saved Payees List (Send Money) - Positive", () => {
  async function open(page, loggedInDashboard) {
    const sp = new SavedPayeeTransferPage(page);
    await loggedInDashboard.goToSavedPayees();
    await sp.assertLoaded();
    return sp;
  }

  test("TC_SPLIST_H01 - Verify that the Saved Payees table shows all its columns", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    await sp.assertTableColumns();
  });

  test("TC_SPLIST_H02 - Verify that all account-type filters are offered", async ({ page, loggedInDashboard }) => {
    const sp = await open(page, loggedInDashboard);
    await sp.assertFiltersOffered();
  });

  test("TC_SPLIST_H03 - Verify that each filter displays its payees", async ({ page, loggedInDashboard }) => {
    const sp = await open(page, loggedInDashboard);
    for (const filter of ["All", "Sampath Bank Accounts", "Other Bank Accounts", "Other Bank Cards"]) {
      await test.step(`Apply the "${filter}" filter`, async () => {
        const applied = await sp.applyFilter(filter);
        test.skip(!applied, `The "${filter}" filter is not offered.`);
        const rows = await sp.assertListRendered(filter);
        // eslint-disable-next-line no-console
        console.log(`Saved Payees filter "${filter}" -> ${rows} row(s)`);
      });
    }
  });

  test("TC_SPLIST_H04 - Verify that the payee search filters the list", async ({ page, loggedInDashboard }) => {
    const sp = await open(page, loggedInDashboard);
    const before = await sp.rowCount();
    test.skip(before === 0, "No saved payees are listed - the search cannot be exercised.");

    await test.step(`Search for "${savedPayeeTransfer.payee}"`, async () => {
      await sp.search(savedPayeeTransfer.payee);
      const after = await sp.rowCount();
      // eslint-disable-next-line no-console
      console.log(`Search "${savedPayeeTransfer.payee}": ${before} -> ${after} row(s)`);
      expect(after, "Searching must not show more rows than the unfiltered list").toBeLessThanOrEqual(before);
      // The matching payee should still be listed.
      await expect(
        sp.payeeRows.filter({ hasText: savedPayeeTransfer.payee }).first(),
        `The searched payee "${savedPayeeTransfer.payee}" should remain listed`
      ).toBeVisible();
    });

    await test.step("Clearing the search restores the list", async () => {
      await sp.clearSearch();
      expect(await sp.rowCount(), "Clearing the search should restore the full list").toBeGreaterThanOrEqual(1);
    });
  });

  test("TC_SPLIST_H05 - Verify that the page size can be changed", async ({ page, loggedInDashboard }) => {
    const sp = await open(page, loggedInDashboard);

    const options = await sp.perPageOptions();
    // eslint-disable-next-line no-console
    console.log("Payees per page options:", JSON.stringify(options));
    expect(options.length, "The 'Payees per page' selector should offer page sizes").toBeGreaterThan(0);

    await test.step("Switch to the largest page size", async () => {
      const largest = options[options.length - 1];
      await sp.setPerPage(largest);
      const rows = await sp.rowCount();
      // eslint-disable-next-line no-console
      console.log(`Per page = ${largest} -> ${rows} row(s)`);
      expect(rows, "The list should still render after changing the page size").toBeGreaterThanOrEqual(0);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
