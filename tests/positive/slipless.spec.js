const { test } = require("../../utils/fixtures");
const { SliplessPage } = require("../../pages/SliplessPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const slipless = require("../../test-data/slipless");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Slipless Banking — POSITIVE. Both Cash Deposit and Cash Withdrawal.
 * Dashboard "Sampath Slipless" tile -> tab -> account + amount -> Next/Proceed ->
 * SMS OTP -> Confirm -> slip generated.
 */
test.describe("Slipless Banking - Positive", () => {
  test("TC_SLIP_H01 - Verify that Slipless cash deposit", async ({ page, loggedInDashboard }) => {
    const sless = new SliplessPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Open Slipless Banking", async () => {
      await loggedInDashboard.goToSlipless();
      await sless.assertLoaded();
    });

    await test.step("Open the Cash Deposit tab and validate the form", async () => {
      await sless.selectCashDeposit();
      await sless.assertDepositFormValidations();
    });

    await test.step("Fill the deposit account and amount", async () => {
      await sless.fillDeposit(slipless.deposit);
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await sless.submitDeposit();
      await popup.assertVisible();
    });

    await test.step("Enter the OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the deposit slip was generated", async () => {
      await sless.assertSuccess();
    });
  });

  test("TC_SLIP_H02 - Verify that Slipless cash withdrawal", async ({ page, loggedInDashboard }) => {
    const sless = new SliplessPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Open Slipless Banking", async () => {
      await loggedInDashboard.goToSlipless();
      await sless.assertLoaded();
    });

    await test.step("Open the Cash Withdrawal tab and validate the form", async () => {
      await sless.selectCashWithdrawal();
      await sless.assertWithdrawalFormValidations();
    });

    await test.step("Fill the withdrawal account and amount", async () => {
      await sless.fillWithdrawal(slipless.withdrawal);
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await sless.submitWithdrawal();
      await popup.assertVisible();
    });

    await test.step("Enter the OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the withdrawal slip was generated", async () => {
      await sless.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
