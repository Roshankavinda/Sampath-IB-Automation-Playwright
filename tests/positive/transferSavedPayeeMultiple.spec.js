const { test } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const savedPayeeTransfer = require("../../test-data/savedPayeeTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer to SAVED PAYEES - MULTIPLE (batch) — POSITIVE.
 * Payees & Billers > Saved Payees -> tick the "Add to List." checkbox of SEVERAL payees ->
 * "Pay Now" opens one transfer form with an indexed block per payee (tranList.0, tranList.1,
 * ...) -> fill each amount / purpose / remark -> "Transfer LKR ..." -> OTP -> success.
 *
 * DATA: set savedPayeeTransfer.multiple.payees to the nicknames to batch. Left empty, the
 * test uses the first two listed payees. It SKIPS when fewer than two saved payees exist.
 */
test.describe("Fund Transfer to Saved Payees (Multiple) - Positive", () => {
  test("TC_SPAYEE_H02 - Verify that multiple saved payees can be paid together", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedPayee = new SavedPayeeTransferPage(page);
    const popup = new ConfirmationPopup(page);
    const data = savedPayeeTransfer.multiple;
    let payees = data.payees || [];

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await savedPayee.assertLoaded();
    });

    await test.step("Determine which payees to pay in this batch", async () => {
      if (payees.length < 2) {
        // No explicit list configured - take the first two listed payees.
        payees = (await savedPayee.listedPayeeNames()).slice(0, 2);
      }
      test.skip(
        payees.length < 2,
        `A batch transfer needs at least two saved payees - only ${payees.length} is listed. ` +
          "Add another payee (or set savedPayeeTransfer.multiple.payees) to run this test."
      );
    });

    await test.step("Select multiple saved payees and open the batch transfer form", async () => {
      await savedPayee.selectMultipleSavedPayees(payees);
      await savedPayee.assertBatchFormShows(payees);
    });

    await test.step("Fill the funding account and each payee's amount / purpose / remark", async () => {
      await savedPayee.fillBatchTransfer(data, payees.length);
    });

    await test.step("Submit the batch and validate the OTP/confirmation popup", async () => {
      await savedPayee.submit();
      await popup.assertVisible();
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the batch transfer success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
