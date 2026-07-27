const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Bill Payment by a SAVED BILLER — NEGATIVE / VALIDATION.
 * A zero amount must be rejected, or Next must stay disabled.
 */
test.describe("Bill Payment by Saved Biller - Negative & Validation", () => {
  test("TC_SBILLER_N01 - Zero amount for a saved biller is blocked", async ({ page, loggedInDashboard }) => {
    const savedBiller = new SavedBillerPaymentPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.savedBillerPayment.zeroAmount;

    await test.step("Navigate to Payees & Billers > Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await savedBiller.assertLoaded();
    });

    await test.step(`Pick the saved biller "${data.biller}" and enter a zero amount`, async () => {
      await savedBiller.selectSavedBiller(data.biller);
      await savedBiller.fillPayment(data);
    });

    await test.step("Assert the app rejects it or keeps Next disabled", async () => {
      const enabled = await savedBiller.nextButton.isEnabled().catch(() => false);
      if (enabled) {
        await savedBiller.submit();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(savedBiller.nextButton, "Next should stay disabled for a zero amount").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
