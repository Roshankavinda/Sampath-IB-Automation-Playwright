const { test } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const savedBillerPayment = require("../../test-data/savedBillerPayment");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Biller - REMOVE FROM FAVOURITES — POSITIVE.
 * The row's star control toggles: clicking it while the biller IS a favourite removes it
 * from the "Your favourite list" panel.
 *
 * Re-runnable + self-restoring: the biller is re-added at the end, so the account's
 * favourites are left exactly as they were found.
 */
test.describe("Saved Biller - Remove from Favourites - Positive", () => {
  test("TC_SBFAV_H02 - Verify that a saved biller can be removed from favourites", async ({
    page,
    loggedInDashboard,
  }) => {
    const sb = new SavedBillerPaymentPage(page);
    const name = savedBillerPayment.biller;

    await test.step("Navigate to Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await sb.assertLoaded();
      await sb.assertFavouritesPanelShown();
    });

    const row = await sb.findRow(name);
    test.skip(!(await sb.isFavourite(name)), `"${name}" is not a favourite - run TC_SBFAV_H01 first.`);

    try {
      await test.step(`Remove "${name}" from favourites`, async () => {
        await sb.removeFromFavourites(row, name);
      });
    } finally {
      // Restore the original state so the account is left as found.
      await sb.addToFavourites(row, name).catch(() => {});
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
