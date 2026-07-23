const { test } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherBankTransferPage } = require("../../pages/OtherBankTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Other Bank — NEGATIVE / VALIDATION.
 */
test.describe("Fund Transfer - Other Bank - Negative & Validation", () => {
  test("TC_FT_OTHER_N01 - Transfer to an invalid account number is rejected", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const otherBank = new OtherBankTransferPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.otherBankTransfer.invalidAccount;

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
      await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
