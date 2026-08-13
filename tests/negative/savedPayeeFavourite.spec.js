const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const savedPayeeTransfer = require("../../test-data/savedPayeeTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Payee - Add to Favourites — NEGATIVE / VALIDATION.
 *   N01 the favourites panel + its search box are displayed
 *   N02 searching favourites for a non-existent payee returns no match
 *   N03 a payee already in favourites is not duplicated by favouriting it again
 *
 * All cases are non-destructive: nothing is un-favourited and no transfer is made.
 */
test.describe("Saved Payee - Add to Favourites - Negative & Validation", () => {
  const payeeName = savedPayeeTransfer.payee;

  async function openSavedPayees(page, loggedInDashboard) {
    const savedPayee = new SavedPayeeTransferPage(page);
    await loggedInDashboard.goToSavedPayees();
    await savedPayee.assertLoaded();
    return savedPayee;
  }

  test("TC_SPFAV_N01 - Verify that the favourites panel and its search box are displayed", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedPayee = await openSavedPayees(page, loggedInDashboard);
    await savedPayee.assertFavouritesPanelShown();
    await expect(savedPayee.favouritesSearch, "The favourites search box should be visible").toBeVisible();
  });

  test("TC_SPFAV_N02 - Verify that searching favourites for an unknown payee returns no match", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedPayee = await openSavedPayees(page, loggedInDashboard);
    await savedPayee.assertFavouritesPanelShown();
    await savedPayee.searchFavourites("zzz_no_such_payee_zzz");

    const emptyShown = await savedPayee.noFavouritesState.isVisible().catch(() => false);
    const stillListed = await savedPayee.isFavourite(payeeName);
    expect(
      emptyShown || !stillListed,
      "Searching favourites for an unknown payee should show no matching favourite"
    ).toBeTruthy();
  });

  test("TC_SPFAV_N03 - Verify that a payee already in favourites is not duplicated", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedPayee = await openSavedPayees(page, loggedInDashboard);
    await savedPayee.assertFavouritesPanelShown();

    const alreadyFavourite = await savedPayee.isFavourite(payeeName);
    test.skip(
      !alreadyFavourite,
      `"${payeeName}" is not in favourites yet - run the positive TC_SPFAV_H01 first so this duplicate check applies.`
    );

    const before = await savedPayee.favouriteEntryCount(payeeName);
    const row = await savedPayee.findRow(payeeName);
    await savedPayee.addToFavourites(row, payeeName).catch(() => {});
    await page.waitForTimeout(2000);

    const after = await savedPayee.favouriteEntryCount(payeeName);
    expect(after, `"${payeeName}" must not be duplicated in the favourites list`).toBeLessThanOrEqual(before);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
