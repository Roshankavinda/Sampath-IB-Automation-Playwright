const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const savedBillerPayment = require("../../test-data/savedBillerPayment");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Biller - Add to Favourites — NEGATIVE / VALIDATION.
 *   N01 the favourites panel + its search box are displayed
 *   N02 searching favourites for a non-existent biller returns no match
 *   N03 a biller already in favourites is not duplicated by favouriting it again
 *
 * All cases are non-destructive: nothing is un-favourited and no payment is made.
 */
test.describe("Saved Biller - Add to Favourites - Negative & Validation", () => {
  const billerName = savedBillerPayment.biller;

  async function openSavedBillers(page, loggedInDashboard) {
    const savedBiller = new SavedBillerPaymentPage(page);
    await loggedInDashboard.goToSavedBillers();
    await savedBiller.assertLoaded();
    return savedBiller;
  }

  test("TC_SBFAV_N01 - Verify that the favourites panel and its search box are displayed", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedBiller = await openSavedBillers(page, loggedInDashboard);
    await savedBiller.assertFavouritesPanelShown();
    await expect(savedBiller.favouritesSearch, "The favourites search box should be visible").toBeVisible();
  });

  test("TC_SBFAV_N02 - Verify that searching favourites for an unknown biller returns no match", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedBiller = await openSavedBillers(page, loggedInDashboard);
    await savedBiller.assertFavouritesPanelShown();
    await savedBiller.searchFavourites("zzz_no_such_biller_zzz");

    // Either the app shows its "no favourites" empty state, or simply lists nothing.
    const emptyShown = await savedBiller.noFavouritesState.isVisible().catch(() => false);
    const stillListed = await savedBiller.isFavourite(billerName);
    expect(
      emptyShown || !stillListed,
      "Searching favourites for an unknown biller should show no matching favourite"
    ).toBeTruthy();
  });

  test("TC_SBFAV_N03 - Verify that a biller already in favourites is not duplicated", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedBiller = await openSavedBillers(page, loggedInDashboard);
    await savedBiller.assertFavouritesPanelShown();

    const alreadyFavourite = await savedBiller.isFavourite(billerName);
    test.skip(
      !alreadyFavourite,
      `"${billerName}" is not in favourites yet - run the positive TC_SBFAV_H01 first so this duplicate check applies.`
    );

    const before = await savedBiller.favouriteEntryCount(billerName);
    const row = await savedBiller.findRow(billerName);
    await savedBiller.addToFavourites(row, billerName).catch(() => {});
    await page.waitForTimeout(2000);

    const after = await savedBiller.favouriteEntryCount(billerName);
    expect(after, `"${billerName}" must not be duplicated in the favourites list`).toBeLessThanOrEqual(before);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
