const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OwnAccountPage } = require("../../pages/OwnAccountPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Own Account — NEGATIVE / VALIDATION.
 *
 * A comprehensive negative matrix for this form:
 *   N01  the account dropdowns display selectable values (not empty skeletons)
 *   N02  empty form -> required-field errors
 *   N03  missing To Account -> "To Account is required"
 *   N04  missing Amount     -> "Amount is required"
 *   N05  missing remarks     -> "Sender/Beneficiary Remark is required"
 *   N06  zero amount is blocked
 *   N07  non-numeric amount is not accepted
 *   N08  negative amount is not accepted
 *   N09  same From = To account is not allowed
 *   N10  amount above the available balance is rejected
 */
test.describe("Fund Transfer - Own Account - Negative & Validation", () => {
  const neg = negative.ownTransfer;

  async function openOwnAccountForm(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    await sendMoney.selectOwnAccountTab();
    await ownAccount.assertLoaded();
    return ownAccount;
  }

  test("TC_FT_OWN_N01 - Verify that Account dropdowns display selectable values", async ({ page, loggedInDashboard }) => {
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    // The From/To account dropdowns must load with real options - an empty (skeleton-only)
    // dropdown would make a transfer impossible.
    await ownAccount.assertAccountsPopulated();
  });

  test("TC_FT_OWN_N02 - Verify that Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    // Submit is not disabled on this form - the app validates on click instead.
    await ownAccount.submitButton.click();
    await ownAccount.assertRequiredValidationShown();
  });

  test("TC_FT_OWN_N03 - Verify that Missing To Account is blocked", async ({ page, loggedInDashboard }) => {
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    // Everything except the To Account.
    await ownAccount.fillPartial({
      fromAccount: neg.base.fromAccount,
      amount: neg.base.amount,
      senderRemark: neg.base.senderRemark,
      beneficiaryRemark: neg.base.beneficiaryRemark,
    });
    await ownAccount.submitButton.click();
    await assertValidationError(page, neg.requiredFields.toAccount);
    await expect(ownAccount.toAccountSelect, "The form should stay open").toBeVisible();
  });

  test("TC_FT_OWN_N04 - Verify that Missing Amount is blocked", async ({ page, loggedInDashboard }) => {
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    await ownAccount.fillPartial({
      fromAccount: neg.base.fromAccount,
      toAccount: neg.base.toAccount,
      senderRemark: neg.base.senderRemark,
      beneficiaryRemark: neg.base.beneficiaryRemark,
    });
    await ownAccount.submitButton.click();
    await assertValidationError(page, neg.requiredFields.amount);
  });

  test("TC_FT_OWN_N05 - Verify that Missing remarks are blocked", async ({ page, loggedInDashboard }) => {
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    // Accounts + amount only; both remark fields left empty.
    await ownAccount.fillPartial({
      fromAccount: neg.base.fromAccount,
      toAccount: neg.base.toAccount,
      amount: neg.base.amount,
    });
    await ownAccount.submitButton.click();
    await assertValidationError(page, `${neg.requiredFields.senderRemark}|${neg.requiredFields.beneficiaryRemark}`);
  });

  test("TC_FT_OWN_N06 - Verify that Zero amount is blocked", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = neg.zeroAmount;
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    await ownAccount.fillForm(data);
    await ownAccount.ensureOneTimeTransaction();

    const enabled = await ownAccount.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await ownAccount.submit();
      await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
    } else {
      await expect(ownAccount.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_FT_OWN_N07 - Verify that Non-numeric amount is not accepted", async ({ page, loggedInDashboard }) => {
    const data = neg.nonNumericAmount;
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    await ownAccount.fillPartial({
      fromAccount: data.fromAccount,
      toAccount: data.toAccount,
      amount: data.amount, // "abcd"
      senderRemark: data.senderRemark,
      beneficiaryRemark: data.beneficiaryRemark,
    });

    // The numeric field should ignore letters (value stays empty). If it somehow accepted
    // something, submitting must be rejected with an amount/required validation.
    const digits = await ownAccount.amountDigits();
    if (digits === "") {
      await ownAccount.submitButton.click();
      await assertValidationError(page, data.expectedError);
    } else {
      await ownAccount.submitButton.click();
      await assertValidationError(page, data.expectedError);
    }
  });

  test("TC_FT_OWN_N08 - Verify that Negative amount is not accepted", async ({ page, loggedInDashboard }) => {
    const data = neg.negativeAmount;
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    await ownAccount.fillPartial({
      fromAccount: data.fromAccount,
      toAccount: data.toAccount,
      amount: data.amount, // "-100"
      senderRemark: data.senderRemark,
      beneficiaryRemark: data.beneficiaryRemark,
    });

    // The field should not hold a usable negative amount: either the minus was stripped to a
    // positive/empty value, or submitting is rejected with an amount validation.
    const raw = await ownAccount.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    await ownAccount.submitButton.click();
    await assertValidationError(page, data.expectedError);
  });

  test("TC_FT_OWN_N09 - Verify that Same From = To account is not allowed", async ({ page, loggedInDashboard }) => {
    const data = neg.sameAccount;
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    const { fromVal, toVal, matched } = await ownAccount.trySameAccountBothSides(data.account);

    if (!matched) {
      // The To dropdown excludes the From account, so the same account could not be chosen -
      // that itself enforces the From != To rule.
      expect(toVal, "The To account should not be settable to the same value as the From account").not.toBe(fromVal);
      return;
    }
    // The app allowed the same account on both sides; filling and submitting must be blocked.
    await ownAccount.amountInput.fill(data.amount);
    await ownAccount.senderRemarkInput.fill(data.senderRemark);
    await ownAccount.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
    await ownAccount.submitButton.click();
    await assertValidationError(page, data.expectedError);
  });

  test("TC_FT_OWN_N10 - Verify that Transfer above available balance is rejected", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = neg.insufficientFunds;
    const ownAccount = await openOwnAccountForm(page, loggedInDashboard);
    await ownAccount.fillForm(data);
    await ownAccount.ensureOneTimeTransaction();
    await ownAccount.submit();
    await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
