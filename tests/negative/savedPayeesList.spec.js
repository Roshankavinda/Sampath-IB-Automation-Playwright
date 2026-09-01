const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Send Money > Saved Payees tab — NEGATIVE / VALIDATION.
 *   N01 searching for an unknown payee returns no rows (and says so)
 *   N02 a filter with no payees shows an empty state, not a blank panel
 *   N03 the page size never renders more rows than the selected size
 */
test.describe("Saved Payees List (Send Money) - Negative & Validation", () => {
  async function open(page, loggedInDashboard) {
    const sp = new SavedPayeeTransferPage(page);
    await loggedInDashboard.goToSavedPayees();
    await sp.assertLoaded();
    return sp;
  }

  test("TC_SPLIST_N01 - Verify that searching an unknown payee returns no rows", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    await sp.search("zzz_no_such_payee_zzz");

    const rows = await sp.rowCount();
    const empty = await sp.emptyState.isVisible().catch(() => false);
    expect(rows === 0 || empty, "An unknown payee search should return no matching rows").toBeTruthy();
  });

  test("TC_SPLIST_N02 - Verify that every filter renders content or an empty state", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    for (const filter of ["Sampath Bank Accounts", "Other Bank Cards"]) {
      const applied = await sp.applyFilter(filter);
      if (!applied) continue;
      await sp.assertListRendered(filter);
    }
  });

  test("TC_SPLIST_N03 - Verify that the list never exceeds the selected page size", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = await open(page, loggedInDashboard);
    const options = await sp.perPageOptions();
    test.skip(options.length === 0, "The 'Payees per page' selector is not available.");

    const smallest = options[0];
    await sp.setPerPage(smallest);
    const rows = await sp.rowCount();
    expect(
      rows,
      `With a page size of ${smallest}, the table must not render more than ${smallest} rows (rendered ${rows})`
    ).toBeLessThanOrEqual(Number(smallest));
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
