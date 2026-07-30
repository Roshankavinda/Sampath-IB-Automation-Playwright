const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Bill Payment by a SAVED BILLER — NEGATIVE / VALIDATION.
 *   N01 zero amount is blocked
 *   N02 negative amount is not accepted
 * (Requires the saved biller to exist.)
 */
test.describe("Bill Payment by Saved Biller - Negative & Validation", () => {
  const neg = negative.savedBillerPayment;

  async function openBillerPayment(page, loggedInDashboard, biller) {
    const savedBiller = new SavedBillerPaymentPage(page);
    await loggedInDashboard.goToSavedBillers();
    await savedBiller.assertLoaded();
    await savedBiller.selectSavedBiller(biller);
    return savedBiller;
  }

  test("TC_SBILLER_N01 - Verify that Zero amount for a saved biller is blocked", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = neg.zeroAmount;
    const savedBiller = await openBillerPayment(page, loggedInDashboard, data.biller);
    await savedBiller.fillPayment(data);
    if (await savedBiller.nextButton.isEnabled().catch(() => false)) {
      await savedBiller.submit();
      await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
    } else {
      await expect(savedBiller.nextButton, "Next should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_SBILLER_N02 - Verify that Negative amount is not accepted", async ({ page, loggedInDashboard }) => {
    const data = neg.negativeAmount;
    const savedBiller = await openBillerPayment(page, loggedInDashboard, data.biller);
    await savedBiller.fillPayment(data);
    const raw = await savedBiller.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    if (await savedBiller.nextButton.isEnabled().catch(() => false)) {
      await savedBiller.submit();
      await assertValidationError(page, data.expectedError);
    } else {
      await expect(savedBiller.nextButton, "Next should stay disabled for a negative amount").toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
