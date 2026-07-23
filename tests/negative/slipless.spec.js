const { test, expect } = require("../../utils/fixtures");
const { SliplessPage } = require("../../pages/SliplessPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Slipless Banking — NEGATIVE / VALIDATION.
 * A zero amount on either Cash Deposit or Cash Withdrawal must be rejected, or the
 * Next/Proceed button must stay disabled.
 */
test.describe("Slipless Banking - Negative & Validation", () => {
  test("TC_SLIP_N01 - Zero deposit amount is blocked", async ({ page, loggedInDashboard }) => {
    const sless = new SliplessPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.slipless.zeroDeposit;

    await test.step("Open Slipless Banking > Cash Deposit", async () => {
      await loggedInDashboard.goToSlipless();
      await sless.assertLoaded();
      await sless.selectCashDeposit();
    });

    await test.step("Fill the account and a zero amount", async () => {
      await sless.fillDeposit(data);
    });

    await test.step("Assert the app rejects it or keeps Next disabled", async () => {
      if (await sless.nextButton.isEnabled().catch(() => false)) {
        await sless.submitDeposit();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(sless.nextButton, "Next should stay disabled for a zero amount").toBeDisabled();
      }
    });
  });

  test("TC_SLIP_N02 - Zero withdrawal amount is blocked", async ({ page, loggedInDashboard }) => {
    const sless = new SliplessPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.slipless.zeroWithdrawal;

    await test.step("Open Slipless Banking > Cash Withdrawal", async () => {
      await loggedInDashboard.goToSlipless();
      await sless.assertLoaded();
      await sless.selectCashWithdrawal();
    });

    await test.step("Fill the account and a zero amount", async () => {
      await sless.fillWithdrawal(data);
    });

    await test.step("Assert the app rejects it or keeps Proceed disabled", async () => {
      if (await sless.proceedButton.isEnabled().catch(() => false)) {
        await sless.submitWithdrawal();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(sless.proceedButton, "Proceed should stay disabled for a zero amount").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
