const { test } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const savedBillerPayment = require("../../test-data/savedBillerPayment");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Biller - ADD TO FAVOURITES — POSITIVE.
 * Payees & Billers > Saved Billers -> the biller's row has an "Add to Favourites" (star)
 * control -> clicking it adds the biller to the right-hand "Your favourite list" panel.
 *
 * Re-runnable: if the biller is already a favourite the add is skipped and the test simply
 * asserts it is listed, so repeated runs stay green (and nothing is un-favourited).
 */
test.describe("Saved Biller - Add to Favourites - Positive", () => {
  test("TC_SBFAV_H01 - Verify that a saved biller can be added to favourites", async ({ page, loggedInDashboard }) => {
    const savedBiller = new SavedBillerPaymentPage(page);
    const billerName = savedBillerPayment.biller;

    await test.step("Navigate to Payees & Billers > Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await savedBiller.assertLoaded();
    });

    await test.step("Validate the favourites panel is displayed", async () => {
      await savedBiller.assertFavouritesPanelShown();
    });

    await test.step(`Add the saved biller "${billerName}" to favourites`, async () => {
      const row = await savedBiller.findRow(billerName);
      if (await savedBiller.isFavourite(billerName)) {
        // Already a favourite from an earlier run - nothing to add.
        return;
      }
      await savedBiller.addToFavourites(row, billerName);
    });

    await test.step("Validate the biller now appears in 'Your favourite list'", async () => {
      await savedBiller.assertAddedToFavourites(billerName);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
