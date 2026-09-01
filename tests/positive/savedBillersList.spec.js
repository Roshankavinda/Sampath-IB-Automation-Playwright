const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const savedBillerPayment = require("../../test-data/savedBillerPayment");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Payees & Billers > SAVED BILLERS - list display, tabs, search - POSITIVE.
 * Confirmed columns: Add to List | S.No | Template Name | Biller Name | Amount |
 * Field Value | Favourites | Actions.
 * Tabs in the Bill Payment area: New Payment | Saved Billers | Bill Payment History |
 * Government Payment History.
 *
 * VIEW ONLY - no biller is paid, edited or deleted here.
 */
test.describe("Saved Billers List - Positive", () => {
  async function open(page, loggedInDashboard) {
    const sb = new SavedBillerPaymentPage(page);
    await loggedInDashboard.goToSavedBillers();
    await sb.assertLoaded();
    await sb.waitForListReady();
    return sb;
  }

  test("TC_SBLIST_H01 - Verify that the Saved Billers table shows all its columns", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    test.skip((await sb.rowCount()) === 0, "The account has no saved billers - the table is not rendered.");
    await sb.assertTableColumns();
  });

  test("TC_SBLIST_H02 - Verify that the saved billers list renders", async ({ page, loggedInDashboard }) => {
    const sb = await open(page, loggedInDashboard);
    const rows = await sb.assertListRendered("Saved Billers");
    await sb.assertNoError();
    // eslint-disable-next-line no-console
    console.log(`Saved Billers -> ${rows} row(s)`);
  });

  test("TC_SBLIST_H03 - Verify that all Bill Payment tabs are offered", async ({ page, loggedInDashboard }) => {
    const sb = await open(page, loggedInDashboard);
    await sb.assertTabsOffered();
  });

  test("TC_SBLIST_H04 - Verify that each tab can be opened and returns to Saved Billers", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);

    for (const tabName of ["New Payment", "Bill Payment History", "Government Payment History"]) {
      await test.step(`Switch to "${tabName}" and back to Saved Billers`, async () => {
        const switched = await sb.switchTab(tabName);
        test.skip(!switched, `The "${tabName}" tab is not offered on this build/profile.`);
        await sb.assertNoError();

        // Back to Saved Billers - the list must render again, not stay empty.
        const returned = await sb.switchTab("Saved Billers");
        expect(returned, "The 'Saved Billers' tab should be reachable again").toBeTruthy();
        await sb.assertListRendered(`Saved Billers (after ${tabName})`);
      });
    }
  });

  test("TC_SBLIST_H05 - Verify that the biller search filters the list", async ({ page, loggedInDashboard }) => {
    const sb = await open(page, loggedInDashboard);
    const before = await sb.rowCount();
    test.skip(before === 0, "No saved billers are listed - the search cannot be exercised.");

    // Search for a biller that is really in the list, so the filter can be proven to work.
    // CONFIRMED live: the search is a "starts with" match on the TEMPLATE NAME only (it does
    // not match Biller Name or Field Value), and it breaks on a term containing a space
    // (see TC_SBLIST_N05), so search on the first word of a listed template name.
    const names = await sb.listedBillerNames();
    test.skip(names.length === 0, "The template names could not be read from the table.");
    const term = names[0].split(/\s+/)[0];

    const searchable = await sb.search(term);
    test.skip(!searchable, "The Saved Billers list does not offer a search box.");

    const after = await sb.rowCount();
    // eslint-disable-next-line no-console
    console.log(`Search "${term}": ${before} -> ${after} row(s)`);
    expect(after, "Searching must not show more rows than the unfiltered list").toBeLessThanOrEqual(before);
    expect(after, `Searching for a listed template name ("${term}") should return its biller`).toBeGreaterThan(0);

    await test.step("Clearing the search restores the full list", async () => {
      await sb.clearSearch();
      expect(await sb.rowCount(), "Clearing the search should restore the full list").toBe(before);
    });
  });

  test("TC_SBLIST_H06 - Verify that selecting billers reveals Pay Now and clearing hides it", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const rows = await sb.rowCount();
    test.skip(rows === 0, "No saved billers are listed.");

    const firstRow = sb.billerRows.first();
    const checkbox = firstRow.locator('input[type="checkbox"]').first();
    test.skip(!(await checkbox.isVisible().catch(() => false)), "The row has no 'Add to List' checkbox.");

    await checkbox.check().catch(() => {});
    await expect(sb.payNowButton, "'Pay Now' should appear once a biller is selected").toBeVisible({
      timeout: 20_000,
    });

    await test.step("Unticking every biller hides Pay Now again", async () => {
      await checkbox.uncheck().catch(() => {});
      await page.waitForTimeout(2000);
      await expect(sb.payNowButton, "'Pay Now' should disappear when no biller is selected").toBeHidden();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
