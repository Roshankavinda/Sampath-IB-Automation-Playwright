const { test, expect } = require("../../utils/fixtures");
const { SliplessPage } = require("../../pages/SliplessPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Slipless Banking — NEGATIVE / VALIDATION.
 *   N01 zero deposit amount is blocked
 *   N02 zero withdrawal amount is blocked
 *   N03 the Deposit account dropdown displays selectable values
 *   N04 negative deposit amount is not accepted
 *   N05 non-numeric deposit amount is not accepted
 */
test.describe("Slipless Banking - Negative & Validation", () => {
  const neg = negative.slipless;

  async function openDeposit(page, loggedInDashboard) {
    const sless = new SliplessPage(page);
    await loggedInDashboard.goToSlipless();
    await sless.assertLoaded();
    await sless.selectCashDeposit();
    return sless;
  }

  test("TC_SLIP_N01 - Verify that Zero deposit amount is blocked", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const sless = await openDeposit(page, loggedInDashboard);
    await sless.fillDeposit(neg.zeroDeposit);
    if (await sless.nextButton.isEnabled().catch(() => false)) {
      await sless.submitDeposit();
      await submitAndExpectRejection(page, popup, neg.zeroDeposit.expectedError, credentials.otp);
    } else {
      await expect(sless.nextButton, "Next should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_SLIP_N02 - Verify that Zero withdrawal amount is blocked", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const sless = new SliplessPage(page);
    await loggedInDashboard.goToSlipless();
    await sless.assertLoaded();
    await sless.selectCashWithdrawal();
    await sless.fillWithdrawal(neg.zeroWithdrawal);
    if (await sless.proceedButton.isEnabled().catch(() => false)) {
      await sless.submitWithdrawal();
      await submitAndExpectRejection(page, popup, neg.zeroWithdrawal.expectedError, credentials.otp);
    } else {
      await expect(sless.proceedButton, "Proceed should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_SLIP_N03 - Verify that Deposit account dropdown displays selectable values", async ({ page, loggedInDashboard }) => {
    const sless = await openDeposit(page, loggedInDashboard);
    await sless.assertDepositFormValidations();
  });

  test("TC_SLIP_N04 - Verify that Negative deposit amount is not accepted", async ({ page, loggedInDashboard }) => {
    const sless = await openDeposit(page, loggedInDashboard);
    await sless.fillDeposit(neg.negativeDeposit);
    const raw = await sless.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    if (await sless.nextButton.isEnabled().catch(() => false)) {
      await sless.nextButton.click();
      await assertValidationError(page, neg.negativeDeposit.expectedError);
    } else {
      await expect(sless.nextButton, "Next should stay disabled for a negative amount").toBeDisabled();
    }
  });

  test("TC_SLIP_N05 - Verify that Non-numeric deposit amount is not accepted", async ({ page, loggedInDashboard }) => {
    const sless = await openDeposit(page, loggedInDashboard);
    await sless.fillDeposit(neg.nonNumericDeposit).catch(() => {});
    if (await sless.nextButton.isEnabled().catch(() => false)) {
      await sless.nextButton.click();
      await assertValidationError(page, neg.nonNumericDeposit.expectedError);
    } else {
      await expect(sless.nextButton, "Next should stay disabled for a non-numeric amount").toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
