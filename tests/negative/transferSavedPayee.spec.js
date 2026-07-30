const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer by a SAVED PAYEE — NEGATIVE / VALIDATION.
 *   N01 zero amount is blocked
 *   N02 negative amount is not accepted
 *   N03 non-numeric amount is not accepted
 * (Requires the saved payee to exist.)
 */
test.describe("Fund Transfer by Saved Payee - Negative & Validation", () => {
  const neg = negative.savedPayeeTransfer;

  async function openPayeeTransfer(page, loggedInDashboard) {
    const savedPayee = new SavedPayeeTransferPage(page);
    await loggedInDashboard.goToSavedPayees();
    await savedPayee.assertLoaded();
    await savedPayee.selectSavedPayee(neg.payee);
    return savedPayee;
  }

  test("TC_SPAYEE_N01 - Verify that Zero amount to a saved payee is blocked", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const savedPayee = await openPayeeTransfer(page, loggedInDashboard);
    await savedPayee.fillTransfer(neg.zeroAmount);
    if (await savedPayee.submitButton.isEnabled().catch(() => false)) {
      await savedPayee.submit();
      await submitAndExpectRejection(page, popup, neg.zeroAmount.expectedError, credentials.otp);
    } else {
      await expect(savedPayee.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_SPAYEE_N02 - Verify that Negative amount is not accepted", async ({ page, loggedInDashboard }) => {
    const savedPayee = await openPayeeTransfer(page, loggedInDashboard);
    await savedPayee.fillTransfer({ ...neg.zeroAmount, amount: neg.negativeAmount.amount });
    const raw = await savedPayee.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    if (await savedPayee.submitButton.isEnabled().catch(() => false)) {
      await savedPayee.submit();
      await assertValidationError(page, neg.negativeAmount.expectedError);
    } else {
      await expect(savedPayee.submitButton, "Submit should stay disabled for a negative amount").toBeDisabled();
    }
  });

  test("TC_SPAYEE_N03 - Verify that Non-numeric amount is not accepted", async ({ page, loggedInDashboard }) => {
    const savedPayee = await openPayeeTransfer(page, loggedInDashboard);
    await savedPayee.fillTransfer({ ...neg.zeroAmount, amount: neg.nonNumericAmount.amount }).catch(() => {});
    if (await savedPayee.submitButton.isEnabled().catch(() => false)) {
      await savedPayee.submit();
      await assertValidationError(page, neg.nonNumericAmount.expectedError);
    } else {
      await expect(savedPayee.submitButton, "Submit should stay disabled for a non-numeric amount").toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
