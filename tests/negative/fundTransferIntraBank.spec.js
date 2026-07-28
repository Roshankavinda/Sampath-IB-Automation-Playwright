const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherBankTransferPage } = require("../../pages/OtherBankTransferPage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Intra Bank (Sampath Bank) — NEGATIVE / VALIDATION.
 *   N01 Bank / From / Purpose dropdowns display selectable values
 *   N02 empty form -> required-field errors
 *   N03 missing To Account Number -> required
 *   N04 missing Amount -> required
 *   N05 zero amount is blocked
 *   N06 non-numeric amount is not accepted
 *   N07 negative amount is not accepted
 *   N08 invalid Sampath account (name does not resolve) is rejected
 */
test.describe("Fund Transfer - Intra Bank (Sampath) - Negative & Validation", () => {
  const neg = negative.intraBankTransfer;

  async function openForm(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    const intra = new OtherBankTransferPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    await sendMoney.selectOtherAccountsTab();
    await intra.assertLoaded();
    return intra;
  }

  test("TC_FT_INTRA_N01 - Bank / account / purpose dropdowns display selectable values", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    await intra.assertDropdownsPopulated();
  });

  test("TC_FT_INTRA_N02 - Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    await intra.submitButton.click();
    await assertValidationError(page, "is required");
    await expect(intra.toAccountNumberInput, "The transfer form should stay open").toBeVisible();
  });

  test("TC_FT_INTRA_N03 - Missing To Account Number is blocked", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    await intra.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      amount: neg.base.amount,
      senderRemark: neg.base.senderRemark,
      beneficiaryRemark: neg.base.beneficiaryRemark,
    });
    await intra.submitButton.click();
    await assertValidationError(page, neg.requiredFields.toAccount);
  });

  test("TC_FT_INTRA_N04 - Missing Amount is blocked", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    await intra.fillPartial({
      fromAccount: neg.base.fromAccount,
      bank: neg.base.bank,
      toAccountNumber: neg.base.toAccountNumber,
      senderRemark: neg.base.senderRemark,
      beneficiaryRemark: neg.base.beneficiaryRemark,
    });
    await intra.submitButton.click();
    await assertValidationError(page, neg.requiredFields.amount);
  });

  test("TC_FT_INTRA_N05 - Zero amount is blocked", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    await intra.fillPartial({ fromAccount: neg.base.fromAccount, bank: neg.base.bank, amount: neg.zeroAmount.amount });
    const enabled = await intra.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await intra.submitButton.click();
      await assertValidationError(page, neg.zeroAmount.expectedError);
    } else {
      await expect(intra.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_FT_INTRA_N06 - Non-numeric amount is not accepted", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    await intra.fillPartial({ fromAccount: neg.base.fromAccount, bank: neg.base.bank, amount: neg.nonNumericAmount.amount });
    await intra.submitButton.click();
    await assertValidationError(page, neg.nonNumericAmount.expectedError);
  });

  test("TC_FT_INTRA_N07 - Negative amount is not accepted", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    await intra.fillPartial({ fromAccount: neg.base.fromAccount, bank: neg.base.bank, amount: neg.negativeAmount.amount });
    const raw = await intra.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    await intra.submitButton.click();
    await assertValidationError(page, neg.negativeAmount.expectedError);
  });

  test("TC_FT_INTRA_N08 - Invalid Sampath account number is rejected", async ({ page, loggedInDashboard }) => {
    const intra = await openForm(page, loggedInDashboard);
    const data = neg.invalidAccount;
    await intra.selectFromAccount(data.fromAccount);
    await intra.selectBank(data.bank);
    await intra.toAccountNumberInput.click();
    await intra.toAccountNumberInput.fill(data.toAccountNumber);
    await intra.amountInput.fill(data.amount).catch(() => {});

    const enabled = await intra.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await intra.submit();
      await assertValidationError(page, data.expectedError);
    } else {
      await expect(intra.submitButton, "Submit should stay disabled for an unresolved account").toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
