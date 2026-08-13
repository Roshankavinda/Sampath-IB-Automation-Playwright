const { test } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const savedBillerPayment = require("../../test-data/savedBillerPayment");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Bill Payment by SAVED BILLERS - MULTIPLE (batch) — POSITIVE.
 * Payees & Billers > Saved Billers -> tick the "Add to List" checkbox of SEVERAL billers ->
 * "Pay Now" opens one payment form containing a block per selected biller -> fill each
 * amount (+ its "Re-enter" reference) -> Pay now -> OTP -> success.
 *
 * DATA: set savedBillerPayment.multiple.billers to the template names to batch. Left empty,
 * the test uses the first two listed billers. It SKIPS when fewer than two saved billers
 * exist (the account currently has only one), rather than failing on missing data.
 */
test.describe("Bill Payment by Saved Billers (Multiple) - Positive", () => {
  test("TC_SBILLER_H02 - Verify that multiple saved billers can be paid together", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedBiller = new SavedBillerPaymentPage(page);
    const popup = new ConfirmationPopup(page);
    const data = savedBillerPayment.multiple;
    let billers = data.billers || [];

    await test.step("Navigate to Payees & Billers > Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await savedBiller.assertLoaded();
    });

    await test.step("Determine which billers to pay in this batch", async () => {
      if (billers.length < 2) {
        // No explicit list configured - take the first two listed billers.
        billers = (await savedBiller.listedBillerNames()).slice(0, 2);
      }
      test.skip(
        billers.length < 2,
        `A batch payment needs at least two saved billers - only ${billers.length} is listed. ` +
          "Add another biller (or set savedBillerPayment.multiple.billers) to run this test."
      );
    });

    await test.step("Select multiple saved billers and open the batch payment form", async () => {
      await savedBiller.selectMultipleSavedBillers(billers);
      await savedBiller.assertBatchFormShows(billers);
    });

    await test.step("Fill the funding account and each biller's amount", async () => {
      await savedBiller.fillBatchPayment({ ...data, referenceValue: savedBillerPayment.referenceValue });
    });

    await test.step("Submit the batch and validate the OTP/confirmation popup", async () => {
      await savedBiller.submit();
      await popup.assertVisible();
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the batch payment success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
