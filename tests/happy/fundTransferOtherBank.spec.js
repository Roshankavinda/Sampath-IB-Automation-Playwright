const { test } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherBankTransferPage } = require("../../pages/OtherBankTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, otherBankTransfer } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Other Bank — HAPPY PATH.
 * Login -> Send Money -> Other Accounts -> From -> Bank -> account + name ->
 * amount -> purpose -> One-time -> Submit -> OTP -> success.
 */
test.describe("Fund Transfer - Other Bank - Happy Path", () => {
  test("TC_FT_OTHER_H01 - Transfer to another bank (One-time)", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const otherBank = new OtherBankTransferPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Send Money via Quick Actions", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
    });

    await test.step("Open the 'Other Accounts' tab and validate the form", async () => {
      await sendMoney.selectOtherAccountsTab();
      await otherBank.assertLoaded();
    });

    await test.step("Select From Account and the destination bank", async () => {
      await otherBank.selectFromAccount(otherBankTransfer.fromAccount);
      await otherBank.selectBank(otherBankTransfer.bank);
    });

    await test.step("Enter the beneficiary account number and name", async () => {
      await otherBank.enterToAccountAndBeneficiary(
        otherBankTransfer.toAccountNumber,
        otherBankTransfer.beneficiaryName
      );
    });

    await test.step("Fill amount, purpose and beneficiary remark", async () => {
      await otherBank.fillAmountAndDetails(otherBankTransfer);
    });

    await test.step("Ensure One-time Transaction mode is selected", async () => {
      await otherBank.ensureOneTimeTransaction();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await otherBank.submit();
      await popup.assertVisible();
      await popup.verifyDetails({
        amount: otherBankTransfer.amount,
        beneficiaryName: otherBankTransfer.beneficiaryName,
      });
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the transaction success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
