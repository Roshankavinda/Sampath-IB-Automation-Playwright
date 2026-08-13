const { test } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const savedPayeeTransfer = require("../../test-data/savedPayeeTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Saved Payee - REMOVE FROM FAVOURITES — POSITIVE.
 * The row's star toggles: clicking it while the payee IS a favourite removes it from the
 * "Your favourite list" panel. Self-restoring - the payee is re-added at the end.
 */
test.describe("Saved Payee - Remove from Favourites - Positive", () => {
  test("TC_SPFAV_H02 - Verify that a saved payee can be removed from favourites", async ({
    page,
    loggedInDashboard,
  }) => {
    const sp = new SavedPayeeTransferPage(page);
    const name = savedPayeeTransfer.payee;

    await test.step("Navigate to Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await sp.assertLoaded();
      await sp.assertFavouritesPanelShown();
    });

    const row = await sp.findRow(name);
    test.skip(!(await sp.isFavourite(name)), `"${name}" is not a favourite - run TC_SPFAV_H01 first.`);

    try {
      await test.step(`Remove "${name}" from favourites`, async () => {
        await sp.removeFromFavourites(row, name);
      });
    } finally {
      await sp.addToFavourites(row, name).catch(() => {});
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
