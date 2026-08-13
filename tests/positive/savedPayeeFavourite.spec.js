const { test } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const savedPayeeTransfer = require("../../test-data/savedPayeeTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Payee - ADD TO FAVOURITES — POSITIVE.
 * Payees & Billers > Saved Payees -> the payee's row has an "Add to Favorites" (star)
 * control -> clicking it adds the payee to the right-hand "Your favourite list" panel.
 *
 * Re-runnable: if the payee is already a favourite the add is skipped and the test simply
 * asserts it is listed, so repeated runs stay green (and nothing is un-favourited).
 */
test.describe("Saved Payee - Add to Favourites - Positive", () => {
  test("TC_SPFAV_H01 - Verify that a saved payee can be added to favourites", async ({ page, loggedInDashboard }) => {
    const savedPayee = new SavedPayeeTransferPage(page);
    const payeeName = savedPayeeTransfer.payee;

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await savedPayee.assertLoaded();
    });

    await test.step("Validate the favourites panel is displayed", async () => {
      await savedPayee.assertFavouritesPanelShown();
    });

    await test.step(`Add the saved payee "${payeeName}" to favourites`, async () => {
      const row = await savedPayee.findRow(payeeName);
      if (await savedPayee.isFavourite(payeeName)) {
        // Already a favourite from an earlier run - nothing to add.
        return;
      }
      await savedPayee.addToFavourites(row, payeeName);
    });

    await test.step("Validate the payee now appears in 'Your favourite list'", async () => {
      await savedPayee.assertAddedToFavourites(payeeName);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
