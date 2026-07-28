const { test } = require("../../utils/fixtures");
const { FixedDepositPage } = require("../../pages/FixedDepositPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const fixedDeposit = require("../../test-data/fixedDeposit");
const { credentials } = require("../../test-data/accounts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: FD Create (Open New Fixed Deposit) — POSITIVE.
 * Dashboard tile "Open New Fixed Deposit" -> step 1 resident type -> step 2 FD details
 * (product, tenure, interest mode, nickname, funding account, amount, source of funds,
 * interest-credit account) -> Continue -> review + USER AGREEMENT (view + tick to accept)
 * -> Submit -> (OTP if requested) -> success.
 */
test.describe("FD Create - Positive", () => {
  test("TC_FD_H01 - Open a new Fixed Deposit", async ({ page, loggedInDashboard }) => {
    const fd = new FixedDepositPage(page);

    await test.step("Open 'Open New Fixed Deposit' from the dashboard", async () => {
      await loggedInDashboard.goToOpenFixedDeposit();
      await fd.assertLoaded();
    });

    await test.step(`Step 1: choose resident type (${fixedDeposit.residentType})`, async () => {
      await fd.selectResidentType(fixedDeposit.residentType);
    });

    await test.step("Step 2: the FD details form is displayed", async () => {
      await fd.assertDetailsStepLoaded();
    });

    await test.step(`Step 2: select the product and the "${fixedDeposit.tenure}" tenure`, async () => {
      await fd.selectProductAndTenure(fixedDeposit);
    });

    await test.step("Step 2: validate the FD details form (dropdowns populated)", async () => {
      // Runs after the tenure is chosen: the Funding Account and Interest Payable Mode
      // dropdowns only appear once a tenure card is selected.
      await fd.assertFormValidations();
    });

    await test.step("Step 2: fill the FD details", async () => {
      await fd.fillDetails(fixedDeposit);
    });

    await test.step("Continue to the review / user-agreement step", async () => {
      await fd.continueToReview();
      await fd.assertReviewAgreementStep();
    });

    await test.step("View the user agreement and accept it (tick the checkbox)", async () => {
      await fd.viewUserAgreement();
      await fd.acceptAgreement();
    });

    await test.step("Submit the Fixed Deposit, entering the OTP if requested", async () => {
      await fd.confirmFd();
      const popup = new ConfirmationPopup(page);
      const otpRequested = await popup.otpBoxes
        .first()
        .waitFor({ state: "visible", timeout: 12_000 })
        .then(() => true)
        .catch(() => false);
      if (otpRequested) {
        await popup.enterOtpAndConfirm(credentials.otp);
      }
      await fd.assertFdSubmitted();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
