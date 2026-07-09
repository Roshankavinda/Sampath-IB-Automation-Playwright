const { test, expect } = require("../../utils/fixtures");
const { StopCardPage } = require("../../pages/StopCardPage");
const { stopCard } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Stop Card — NEGATIVE / VALIDATION.
 * Without a card selected, Submit must stay disabled.
 */
test.describe("Stop Card - Negative & Validation", () => {
  test("TC_STOPCARD_N01 - Submit is disabled when no card is selected", async ({ page, loggedInDashboard }) => {
    const stop = new StopCardPage(page);

    await test.step("Navigate to Stop Card via Quick Actions", async () => {
      await loggedInDashboard.goToStopCard();
      await stop.assertLoaded();
    });

    await test.step("Choose a card type but do NOT select a card", async () => {
      await stop.selectCardType(stopCard.credit.cardType);
    });

    await test.step("Submit must stay disabled until a card is chosen", async () => {
      await expect(stop.submitButton, "Submit should be disabled until a card is selected").toBeDisabled({
        timeout: 10_000,
      });
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
