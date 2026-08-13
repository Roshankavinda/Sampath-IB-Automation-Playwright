const { test, expect } = require("../../utils/fixtures");
const { SavedBillerPaymentPage } = require("../../pages/SavedBillerPaymentPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const savedBillerPayment = require("../../test-data/savedBillerPayment");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Bill Payment by Saved Billers (MULTIPLE / batch) — NEGATIVE / VALIDATION.
 *   N01 "Pay Now" is not offered while NO biller is selected
 *   N02 a zero amount in the batch is blocked
 *   N03 a negative amount in the batch is not accepted
 *
 * N02/N03 need at least two saved billers and SKIP otherwise (the account currently has one).
 */
test.describe("Bill Payment by Saved Billers (Multiple) - Negative & Validation", () => {
  const neg = negative.savedBillerPayment;

  async function openSavedBillers(page, loggedInDashboard) {
    const savedBiller = new SavedBillerPaymentPage(page);
    await loggedInDashboard.goToSavedBillers();
    await savedBiller.assertLoaded();
    return savedBiller;
  }

  /** Picks the batch, or skips when fewer than two saved billers exist. */
  async function resolveBatch(savedBiller) {
    let billers = savedBillerPayment.multiple.billers || [];
    if (billers.length < 2) billers = (await savedBiller.listedBillerNames()).slice(0, 2);
    return billers;
  }

  test("TC_SBILLER_N03 - Verify that Pay Now is not offered while no biller is selected", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedBiller = await openSavedBillers(page, loggedInDashboard);
    // Nothing ticked: the batch action must not be available (or must be disabled).
    const visible = await savedBiller.payNowButton.isVisible().catch(() => false);
    if (visible) {
      await expect(
        savedBiller.payNowButton,
        "'Pay Now' should be disabled while no saved biller is selected"
      ).toBeDisabled();
    } else {
      expect(visible, "'Pay Now' should not be offered before a saved biller is selected").toBeFalsy();
    }
  });

  test("TC_SBILLER_N04 - Verify that a zero amount in a batch payment is blocked", async ({
    page,
    loggedInDashboard,
  }) => {
    const popup = new ConfirmationPopup(page);
    const savedBiller = await openSavedBillers(page, loggedInDashboard);
    const billers = await resolveBatch(savedBiller);
    test.skip(billers.length < 2, `A batch needs two saved billers - only ${billers.length} listed.`);

    await savedBiller.selectMultipleSavedBillers(billers);
    await savedBiller.fillBatchPayment({
      fromAccount: savedBillerPayment.multiple.fromAccount,
      amount: neg.zeroAmount.amount,
      referenceValue: savedBillerPayment.referenceValue,
    });

    if (await savedBiller.nextButton.isEnabled().catch(() => false)) {
      await savedBiller.submit();
      await submitAndExpectRejection(page, popup, neg.zeroAmount.expectedError, credentials.otp);
    } else {
      await expect(savedBiller.nextButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_SBILLER_N05 - Verify that a negative amount in a batch payment is not accepted", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedBiller = await openSavedBillers(page, loggedInDashboard);
    const billers = await resolveBatch(savedBiller);
    test.skip(billers.length < 2, `A batch needs two saved billers - only ${billers.length} listed.`);

    await savedBiller.selectMultipleSavedBillers(billers);
    await savedBiller.fillBatchPayment({
      fromAccount: savedBillerPayment.multiple.fromAccount,
      amount: neg.negativeAmount.amount,
      referenceValue: savedBillerPayment.referenceValue,
    });

    const raw = await savedBiller.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
