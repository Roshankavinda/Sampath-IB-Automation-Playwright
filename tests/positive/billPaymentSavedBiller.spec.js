const { test } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const savedBillerPayment = require("../../test-data/savedBillerPayment");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Bill Payment by a SAVED BILLER — POSITIVE.
 * Login -> Payees & Billers > Saved Billers -> pick the saved biller ->
 * Pay From / Amount -> Next -> OTP -> success.
 */
test.describe("Bill Payment by Saved Biller - Positive", () => {
  test("TC_SBILLER_H01 - Verify that Pay a saved biller", async ({ page, loggedInDashboard }) => {
    const savedBiller = new SavedBillerPaymentPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Payees & Billers > Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await savedBiller.assertLoaded();
    });

    await test.step(`Pick the saved biller "${savedBillerPayment.biller}"`, async () => {
      await savedBiller.selectSavedBiller(savedBillerPayment.biller);
    });

    await test.step("Validate the payment form, then fill funding account and amount", async () => {
      await savedBiller.assertPaymentFormValidations();
      await savedBiller.fillPayment(savedBillerPayment);
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await savedBiller.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: savedBillerPayment.amount });
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the payment success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
