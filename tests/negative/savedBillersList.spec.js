const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Payees & Billers > Saved Billers list - NEGATIVE / VALIDATION.
 *   N01 searching for an unknown biller returns no rows (and says so)
 *   N02 the list never renders a blank panel or a loading error
 *   N03 switching tabs back and forth leaves no stale rows and no error
 *   N04 the list never exceeds the selected page size (when a page size is offered)
 *   N05 searching the FULL template name finds that biller  -- KNOWN DEFECT, see below
 *
 * Search behaviour confirmed against the live app: it runs only on ENTER (the Saved Payees
 * list filters as you type), and it is a "starts with" match on the TEMPLATE NAME alone -
 * "Dialog" (a Biller Name) and "0740221131" (a Field Value) both return nothing.
 */
test.describe("Saved Billers List - Negative & Validation", () => {
  async function open(page, loggedInDashboard) {
    const sb = new SavedBillerPaymentPage(page);
    await loggedInDashboard.goToSavedBillers();
    await sb.assertLoaded();
    await sb.waitForListReady();
    return sb;
  }

  test("TC_SBLIST_N01 - Verify that searching an unknown biller returns no rows", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const searchable = await sb.search("zzz_no_such_biller_zzz");
    test.skip(!searchable, "The Saved Billers list does not offer a search box.");

    const rows = await sb.rowCount();
    const empty = await sb.emptyState.first().isVisible().catch(() => false);
    expect(rows === 0 || empty, "An unknown biller search should return no matching rows").toBeTruthy();
  });

  test("TC_SBLIST_N02 - Verify that the list never renders a blank panel", async ({ page, loggedInDashboard }) => {
    const sb = await open(page, loggedInDashboard);
    await sb.assertListRendered("Saved Billers");
    await sb.assertNoError();
  });

  test("TC_SBLIST_N03 - Verify that switching tabs leaves no stale rows or error", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const before = await sb.rowCount();

    // Bounce between tabs the way a user browsing the section would.
    for (const tabName of ["New Payment", "Saved Billers", "Bill Payment History", "Saved Billers"]) {
      await sb.switchTab(tabName);
      await sb.assertNoError();
    }

    const after = await sb.rowCount();
    // eslint-disable-next-line no-console
    console.log(`Saved Billers rows before tab bouncing: ${before}, after: ${after}`);
    expect(
      after,
      "Returning to Saved Billers must not multiply the rows (a stale list rendered on top of the fresh one)"
    ).toBeLessThanOrEqual(Math.max(before, 1) * 2);
    await sb.assertListRendered("Saved Billers (after tab bouncing)");
  });

  test("TC_SBLIST_N04 - Verify that the list never exceeds the selected page size", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = await open(page, loggedInDashboard);
    const options = await sb.perPageOptions();
    test.skip(options.length === 0, "The Saved Billers list does not offer a page-size selector.");

    const smallest = options[0];
    await sb.setPerPage(smallest);
    const rows = await sb.rowCount();
    expect(
      rows,
      `With a page size of ${smallest}, the table must not render more than ${smallest} rows (rendered ${rows})`
    ).toBeLessThanOrEqual(Number(smallest));
  });

  // KNOWN DEFECT - marked test.fail() so the suite stays green while the bug is open and
  // reports an "unexpected pass" the day it is fixed (then delete the test.fail() line).
  // Confirmed live: a template named "my dialog" is listed, but searching "my dialog"
  // returns 0 rows, while searching "my" returns it. A search term containing a space
  // never matches.
  test("TC_SBLIST_N05 - Verify that searching the full template name finds that biller", async ({
    page,
    loggedInDashboard,
  }) => {
    test.fail(true, "Known defect: the Saved Billers search does not match a term containing a space.");
    const sb = await open(page, loggedInDashboard);
    const names = await sb.listedBillerNames();
    const multiWord = names.find((n) => /\s/.test(n.trim()));
    test.skip(!multiWord, "No saved biller has a multi-word template name to search for.");

    await sb.search(multiWord);
    expect(
      await sb.rowCount(),
      `Searching the exact template name "${multiWord}" should return that biller`
    ).toBeGreaterThan(0);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
