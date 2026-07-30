const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherBankTransferPage } = require("../../pages/OtherBankTransferPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Other Bank — NEGATIVE / VALIDATION.
 *   N01 Bank / From / Purpose dropdowns display selectable values
 *   N02 empty form -> required-field errors
 *   N03 missing To Account Number -> required
 *   N04 missing Beneficiary Name -> required
 *   N05 missing Amount -> required
 *   N06 zero amount is blocked
 *   N07 non-numeric amount is not accepted
 *   N08 negative amount is not accepted
 *   N09 invalid destination account number is rejected
 */
test.describe("Fund Transfer - Other Bank - Negative & Validation", () => {
  const neg = negative.otherBankTransfer;

  async function openForm(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    const otherBank = new OtherBankTransferPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    await sendMoney.selectOtherAccountsTab();
    await otherBank.assertLoaded();
    return otherBank;
  }

  test("TC_FT_OTHER_N01 - Verify that Bank / account / purpose dropdowns display selectable values", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.assertDropdownsPopulated();
  });

  test("TC_FT_OTHER_N02 - Verify that Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.submitButton.click();
    await assertValidationError(page, "is required");
    await expect(otherBank.toAccountNumberInput, "The transfer form should stay open").toBeVisible();
  });

  test("TC_FT_OTHER_N03 - Verify that Missing To Account Number is blocked", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      beneficiaryName: neg.base.beneficiaryName,
      amount: neg.base.amount,
      beneficiaryRemark: neg.base.beneficiaryRemark,
    });
    await otherBank.submitButton.click();
    await assertValidationError(page, neg.requiredFields.toAccount);
  });

  test("TC_FT_OTHER_N04 - Verify that Missing Beneficiary Name is blocked", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      toAccountNumber: neg.base.toAccountNumber,
      amount: neg.base.amount,
      beneficiaryRemark: neg.base.beneficiaryRemark,
    });
    await otherBank.submitButton.click();
    await assertValidationError(page, neg.requiredFields.beneficiaryName);
  });

  test("TC_FT_OTHER_N05 - Verify that Missing Amount is blocked", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      toAccountNumber: neg.base.toAccountNumber,
      beneficiaryName: neg.base.beneficiaryName,
      beneficiaryRemark: neg.base.beneficiaryRemark,
    });
    await otherBank.submitButton.click();
    await assertValidationError(page, neg.requiredFields.amount);
  });

  test("TC_FT_OTHER_N06 - Verify that Zero amount is blocked", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      toAccountNumber: neg.base.toAccountNumber,
      beneficiaryName: neg.base.beneficiaryName,
      amount: neg.zeroAmount.amount,
    });
    const enabled = await otherBank.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await otherBank.submitButton.click();
      await assertValidationError(page, neg.zeroAmount.expectedError);
    } else {
      await expect(otherBank.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_FT_OTHER_N07 - Verify that Non-numeric amount is not accepted", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      toAccountNumber: neg.base.toAccountNumber,
      beneficiaryName: neg.base.beneficiaryName,
      amount: neg.nonNumericAmount.amount,
    });
    await otherBank.submitButton.click();
    await assertValidationError(page, neg.nonNumericAmount.expectedError);
  });

  test("TC_FT_OTHER_N08 - Verify that Negative amount is not accepted", async ({ page, loggedInDashboard }) => {
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      toAccountNumber: neg.base.toAccountNumber,
      beneficiaryName: neg.base.beneficiaryName,
      amount: neg.negativeAmount.amount,
    });
    const raw = await otherBank.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    await otherBank.submitButton.click();
    await assertValidationError(page, neg.negativeAmount.expectedError);
  });

  test("TC_FT_OTHER_N09 - Verify that Transfer to an invalid account number is rejected", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = neg.invalidAccount;
    const otherBank = await openForm(page, loggedInDashboard);
    await otherBank.selectFromAccount(data.fromAccount);
    await otherBank.selectBank(data.bank);
    await otherBank.enterToAccountAndBeneficiary(data.toAccountNumber, data.beneficiaryName);
    await otherBank.fillAmountAndDetails(data);
    await otherBank.ensureOneTimeTransaction();
    await otherBank.submit();
    await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
