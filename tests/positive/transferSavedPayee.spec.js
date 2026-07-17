const { test } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, savedPayeeTransfer } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer by a SAVED PAYEE — POSITIVE.
 * Login -> Payees & Billers > Saved Payees -> pick the saved payee ->
 * amount / remarks -> One-time -> Submit -> OTP -> success.
 */
test.describe("Fund Transfer by Saved Payee - Positive", () => {
  test("TC_SPAYEE_H01 - Transfer to a saved payee", async ({ page, loggedInDashboard }) => {
    const savedPayee = new SavedPayeeTransferPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await savedPayee.assertLoaded();
    });

    await test.step(`Pick the saved payee "${savedPayeeTransfer.payee}"`, async () => {
      await savedPayee.selectSavedPayee(savedPayeeTransfer.payee);
    });

    await test.step("Validate the transfer form, then fill amount and remarks", async () => {
      await savedPayee.assertTransferFormValidations();
      await savedPayee.fillTransfer(savedPayeeTransfer);
      await savedPayee.ensureOneTimeTransaction();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await savedPayee.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: savedPayeeTransfer.amount });
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the transaction success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
