const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, negative } = require("../../test-data/testData");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer by a SAVED PAYEE — NEGATIVE / VALIDATION.
 * A zero amount must be rejected, or Submit must stay disabled.
 */
test.describe("Fund Transfer by Saved Payee - Negative & Validation", () => {
  test("TC_SPAYEE_N01 - Zero amount to a saved payee is blocked", async ({ page, loggedInDashboard }) => {
    const savedPayee = new SavedPayeeTransferPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.savedPayeeTransfer.zeroAmount;

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await savedPayee.assertLoaded();
    });

    await test.step(`Pick the saved payee "${data.payee}" and enter a zero amount`, async () => {
      await savedPayee.selectSavedPayee(data.payee);
      await savedPayee.fillTransfer(data);
    });

    await test.step("Assert the app rejects it or keeps Submit disabled", async () => {
      const enabled = await savedPayee.submitButton.isEnabled().catch(() => false);
      if (enabled) {
        await savedPayee.submit();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(savedPayee.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
