const { test, expect } = require("../../utils/fixtures");
const { SavedPayeeTransferPage } = require("../../pages/SavedPayeeTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const savedPayeeTransfer = require("../../test-data/savedPayeeTransfer");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer to Saved Payees (MULTIPLE / batch) — NEGATIVE / VALIDATION.
 *   N04 "Pay Now" is not offered while NO payee is selected
 *   N05 a zero amount in the batch is blocked
 *   N06 a negative amount in the batch is not accepted
 *   N07 leaving ONE payee's amount empty blocks the whole batch
 *
 * N05-N07 need at least two saved payees and SKIP otherwise.
 */
test.describe("Fund Transfer to Saved Payees (Multiple) - Negative & Validation", () => {
  const neg = negative.savedPayeeTransfer;
  const data = savedPayeeTransfer.multiple;

  async function openSavedPayees(page, loggedInDashboard) {
    const savedPayee = new SavedPayeeTransferPage(page);
    await loggedInDashboard.goToSavedPayees();
    await savedPayee.assertLoaded();
    return savedPayee;
  }

  /** Picks the batch (explicit list, else the first two listed). */
  async function resolveBatch(savedPayee) {
    let payees = data.payees || [];
    if (payees.length < 2) payees = (await savedPayee.listedPayeeNames()).slice(0, 2);
    return payees;
  }

  test("TC_SPAYEE_N04 - Verify that Pay Now is not offered while no payee is selected", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedPayee = await openSavedPayees(page, loggedInDashboard);
    const visible = await savedPayee.payNowButton.first().isVisible().catch(() => false);
    if (visible) {
      await expect(
        savedPayee.payNowButton.first(),
        "'Pay Now' should be disabled while no saved payee is selected"
      ).toBeDisabled();
    } else {
      expect(visible, "'Pay Now' should not be offered before a saved payee is selected").toBeFalsy();
    }
  });

  test("TC_SPAYEE_N05 - Verify that a zero amount in a batch transfer is blocked", async ({
    page,
    loggedInDashboard,
  }) => {
    const popup = new ConfirmationPopup(page);
    const savedPayee = await openSavedPayees(page, loggedInDashboard);
    const payees = await resolveBatch(savedPayee);
    test.skip(payees.length < 2, `A batch needs two saved payees - only ${payees.length} listed.`);

    await savedPayee.selectMultipleSavedPayees(payees);
    await savedPayee.fillBatchTransfer({ ...data, amount: neg.zeroAmount.amount }, payees.length);

    if (await savedPayee.submitButton.isEnabled().catch(() => false)) {
      await savedPayee.submit();
      await submitAndExpectRejection(page, popup, neg.zeroAmount.expectedError, credentials.otp);
    } else {
      await expect(savedPayee.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_SPAYEE_N06 - Verify that a negative amount in a batch transfer is not accepted", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedPayee = await openSavedPayees(page, loggedInDashboard);
    const payees = await resolveBatch(savedPayee);
    test.skip(payees.length < 2, `A batch needs two saved payees - only ${payees.length} listed.`);

    await savedPayee.selectMultipleSavedPayees(payees);
    await savedPayee.fillBatchTransfer({ ...data, amount: neg.negativeAmount.amount }, payees.length);

    const raw = await savedPayee.amountInputAt(0).inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
  });

  test("TC_SPAYEE_N07 - Verify that one missing amount blocks the whole batch", async ({
    page,
    loggedInDashboard,
  }) => {
    const savedPayee = await openSavedPayees(page, loggedInDashboard);
    const payees = await resolveBatch(savedPayee);
    test.skip(payees.length < 2, `A batch needs two saved payees - only ${payees.length} listed.`);

    await savedPayee.selectMultipleSavedPayees(payees);
    // Fill only the FIRST payee's block; the second is left empty.
    await savedPayee.fillBatchTransfer(data, 1);

    if (await savedPayee.submitButton.isEnabled().catch(() => false)) {
      await savedPayee.submit();
      // The app must block it: an inline required/amount validation, and no OTP popup.
      await expect(
        page.getByText(/required|amount/i).locator("visible=true").first(),
        "A required-amount validation should be shown when one payee's amount is empty"
      ).toBeVisible();
      await expect(
        new ConfirmationPopup(page).otpBoxes.first(),
        "No OTP should be requested while one payee's amount is empty"
      ).toBeHidden();
    } else {
      await expect(
        savedPayee.submitButton,
        "Submit should stay disabled while one payee's amount is empty"
      ).toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
