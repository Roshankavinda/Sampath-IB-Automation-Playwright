const { test } = require("../../utils/fixtures");
const { StopCardPage } = require("../../pages/StopCardPage");
const stopCard = require("../../test-data/stopCard");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Stop Card — NEGATIVE / VALIDATION.
 * Blocking a card is guarded by a confirmation modal: choosing "Back" must cancel the
 * action so the card is NOT blocked and no OTP is requested. (There is no form/Submit to
 * validate - each active card is stopped directly via its STOP button.)
 */
test.describe("Stop Card - Negative & Validation", () => {
  test("TC_STOPCARD_N01 - Cancelling the block modal does not stop the card", async ({ page, loggedInDashboard }) => {
    const stop = new StopCardPage(page);

    await test.step("Navigate to Stop Card via Quick Actions", async () => {
      await stop.openWithRetry(loggedInDashboard);
      await stop.assertLoaded();
    });

    await test.step("Choose the Credit card type and click STOP", async () => {
      await stop.selectCardType(stopCard.credit.cardType);
      await stop.clickStop(stopCard.credit.card);
    });

    await test.step("Cancel via 'Back' - the card must not be blocked and no OTP is shown", async () => {
      await stop.cancelStop();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
