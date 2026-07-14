const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OwnAccountPage } = require("../../pages/OwnAccountPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, negative } = require("../../test-data/testData");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Own Account — NEGATIVE / VALIDATION.
 */
test.describe("Fund Transfer - Own Account - Negative & Validation", () => {
  async function openOwnAccountForm(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    await sendMoney.selectOwnAccountTab();
    await ownAccount.assertLoaded();
    return ownAccount;
  }

  test("TC_FT_OWN_N01 - Transfer above available balance is rejected", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = negative.ownTransfer.insufficientFunds;

    const ownAccount = await test.step("Open Send Money > Own Account", async () =>
      openOwnAccountForm(page, loggedInDashboard));

    await test.step("Fill an amount above the available balance", async () => {
      await ownAccount.fillForm(data);
      await ownAccount.ensureOneTimeTransaction();
    });

    await test.step("Submit and assert the transaction is rejected", async () => {
      await ownAccount.submit();
      await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
    });
  });

  test("TC_FT_OWN_N02 - Zero / below-minimum amount is blocked", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = negative.ownTransfer.zeroAmount;

    const ownAccount = await test.step("Open Send Money > Own Account", async () =>
      openOwnAccountForm(page, loggedInDashboard));

    await test.step("Fill a zero amount", async () => {
      await ownAccount.fillForm(data);
      await ownAccount.ensureOneTimeTransaction();
    });

    await test.step("Assert Submit is blocked, or the app rejects a zero amount", async () => {
      const enabled = await ownAccount.submitButton.isEnabled().catch(() => false);
      if (enabled) {
        await ownAccount.submit();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(ownAccount.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
      }
    });
  });

  test("TC_FT_OWN_N03 - Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const ownAccount = await test.step("Open Send Money > Own Account", async () =>
      openOwnAccountForm(page, loggedInDashboard));

    // Submit is not disabled on this form - the app validates on click instead.
    await test.step("Submit the empty form", async () => {
      await ownAccount.submitButton.click();
    });

    await test.step("Validate the app blocks it with required-field messages", async () => {
      await ownAccount.assertRequiredValidationShown();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
