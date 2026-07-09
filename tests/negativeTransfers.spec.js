const { test, expect } = require("../utils/fixtures");
const { SendMoneyPage } = require("../pages/SendMoneyPage");
const { OwnAccountPage } = require("../pages/OwnAccountPage");
const { OtherBankTransferPage } = require("../pages/OtherBankTransferPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, negativeTransfers } = require("../test-data/testData");
const { getToastText, assertValidationError } = require("../utils/helpers");

/**
 * Negative / validation coverage for fund transfers.
 * Each test drives the same forms as the happy-path flows but with data that
 * MUST be rejected, and asserts the application blocks the transaction.
 *
 * Rejection can occur before or after OTP depending on the validation, so each
 * test enters the OTP only if the popup appears, then asserts the error message.
 */
test.describe("Fund Transfer - Negative & Validation", () => {
  /** Submits, tolerates an OTP prompt, then asserts the app showed the expected error. */
  async function submitAndExpectRejection(page, popup, expectedError) {
    const otpAppeared = await popup.otpBoxes
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (otpAppeared) await popup.enterOtpAndConfirm(credentials.otp);
    await assertValidationError(page, expectedError);
  }

  test("TC_NEG_01 - Own transfer above available balance is rejected", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negativeTransfers.insufficientFunds;

    await test.step("Open Send Money > Own Account", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOwnAccountTab();
      await ownAccount.assertLoaded();
    });

    await test.step("Fill an amount above the available balance", async () => {
      await ownAccount.fillForm(data);
      await ownAccount.ensureOneTimeTransaction();
    });

    await test.step("Submit and assert the transaction is rejected", async () => {
      await ownAccount.submit();
      await submitAndExpectRejection(page, popup, data.expectedError);
    });
  });

  test("TC_NEG_02 - Other-bank transfer to an invalid account is rejected", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const otherBank = new OtherBankTransferPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negativeTransfers.invalidOtherBankAccount;

    await test.step("Open Send Money > Other Accounts", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOtherAccountsTab();
      await otherBank.assertLoaded();
    });

    await test.step("Enter an invalid destination account number", async () => {
      await otherBank.selectFromAccount(data.fromAccount);
      await otherBank.selectBank(data.bank);
      await otherBank.enterToAccountAndBeneficiary(data.toAccountNumber, data.beneficiaryName);
      await otherBank.fillAmountAndDetails(data);
      await otherBank.ensureOneTimeTransaction();
    });

    await test.step("Submit and assert the transaction is rejected", async () => {
      await otherBank.submit();
      await submitAndExpectRejection(page, popup, data.expectedError);
    });
  });

  test("TC_NEG_03 - Own transfer with a zero/below-minimum amount is blocked", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negativeTransfers.zeroAmount;

    await test.step("Open Send Money > Own Account", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOwnAccountTab();
      await ownAccount.assertLoaded();
    });

    await test.step("Fill a zero amount", async () => {
      await ownAccount.fillForm(data);
      await ownAccount.ensureOneTimeTransaction();
    });

    await test.step("Assert Submit is blocked, or the app rejects a zero amount", async () => {
      // Well-behaved forms disable Submit for an invalid amount; if it is enabled,
      // submitting must surface a validation error instead of succeeding.
      const enabled = await ownAccount.submitButton.isEnabled().catch(() => false);
      if (enabled) {
        await ownAccount.submit();
        await submitAndExpectRejection(page, popup, data.expectedError);
      } else {
        await expect(ownAccount.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
      }
    });
  });

  test("TC_NEG_04 - Submit stays disabled on an empty transfer form", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);

    await test.step("Open Send Money > Own Account", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOwnAccountTab();
      await ownAccount.assertLoaded();
    });

    await test.step("With required fields empty, Submit must be disabled", async () => {
      await expect(ownAccount.submitButton, "Submit should be disabled until required fields are filled").toBeDisabled({
        timeout: 10_000,
      });
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const toast = await getToastText(page, 1_500);
      if (toast) await testInfo.attach("last-toast-message", { body: toast, contentType: "text/plain" });
    }
  });
});
