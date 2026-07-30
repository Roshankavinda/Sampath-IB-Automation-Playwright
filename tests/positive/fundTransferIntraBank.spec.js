const { test } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherBankTransferPage } = require("../../pages/OtherBankTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const intraBankTransfer = require("../../test-data/intraBankTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Intra Bank (Sampath Bank) — POSITIVE.
 * Login -> Send Money -> Other Accounts -> Bank = Sampath -> account (name auto-fetched)
 * -> amount -> One-time -> Submit -> OTP -> success.
 */
test.describe("Fund Transfer - Intra Bank (Sampath) - Positive", () => {
  test("TC_FT_INTRA_H01 - Verify that Transfer to another Sampath account (One-time)", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const intra = new OtherBankTransferPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Send Money via Quick Actions", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
    });

    await test.step("Open the 'Other Accounts' tab and validate the form", async () => {
      await sendMoney.selectOtherAccountsTab();
      await intra.assertLoaded();
      await intra.assertFormValidations();
    });

    await test.step("Select From Account and choose Sampath Bank", async () => {
      await intra.selectFromAccount(intraBankTransfer.fromAccount);
      await intra.selectBank(intraBankTransfer.bank);
    });

    await test.step("Enter the Sampath account number and let the name auto-fetch", async () => {
      await intra.enterIntraBankAccount(intraBankTransfer.toAccountNumber, intraBankTransfer.beneficiaryName);
    });

    await test.step("Fill amount and remark", async () => {
      await intra.fillAmountAndDetails(intraBankTransfer);
    });

    await test.step("Ensure One-time Transaction mode is selected", async () => {
      await intra.ensureOneTimeTransaction();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await intra.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: intraBankTransfer.amount });
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
