const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherBankTransferPage } = require("../../pages/OtherBankTransferPage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Intra Bank (Sampath Bank) — NEGATIVE / VALIDATION.
 * An invalid Sampath account number must fail to resolve a beneficiary name,
 * so the app either shows an error or keeps Submit disabled.
 */
test.describe("Fund Transfer - Intra Bank (Sampath) - Negative & Validation", () => {
  test("TC_FT_INTRA_N01 - Invalid Sampath account number is rejected", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const intra = new OtherBankTransferPage(page);
    const data = negative.intraBankTransfer.invalidAccount;

    await test.step("Open Send Money > Other Accounts and choose Sampath Bank", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOtherAccountsTab();
      await intra.assertLoaded();
      await intra.selectFromAccount(data.fromAccount);
      await intra.selectBank(data.bank);
    });

    await test.step("Enter an invalid Sampath account number", async () => {
      await intra.toAccountNumberInput.click();
      await intra.toAccountNumberInput.fill(data.toAccountNumber);
      await intra.amountInput.fill(data.amount).catch(() => {});
    });

    await test.step("Assert the app rejects it (error shown) or keeps Submit disabled", async () => {
      const enabled = await intra.submitButton.isEnabled().catch(() => false);
      if (enabled) {
        await intra.submit();
        await assertValidationError(page, data.expectedError);
      } else {
        await expect(intra.submitButton, "Submit should stay disabled for an unresolved account").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
