const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherCreditCardsPage } = require("../../pages/OtherCreditCardsPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Other Bank Credit Card — NEGATIVE / VALIDATION.
 *   N01 Bank (issuer) / From dropdowns display selectable values
 *   N02 empty form -> required-field errors
 *   N03 mismatched Card Number / Re-enter Card Number is blocked
 *   N04 invalid (too-short) card number is rejected
 *   N05 missing Amount -> required
 *   N06 zero amount is blocked
 *   N07 non-numeric amount is not accepted
 *   N08 negative amount is not accepted
 */
test.describe("Fund Transfer - Other Bank Credit Card - Negative & Validation", () => {
  const neg = negative.otherCreditCardTransfer;

  async function openForm(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    const cards = new OtherCreditCardsPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    await sendMoney.selectOtherCreditCardsTab();
    await cards.assertLoaded();
    return cards;
  }

  test("TC_FT_OCC_N01 - Verify that Bank / account dropdowns display selectable values", async ({ page, loggedInDashboard }) => {
    const cards = await openForm(page, loggedInDashboard);
    await cards.assertDropdownsPopulated();
  });

  test("TC_FT_OCC_N02 - Verify that Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const cards = await openForm(page, loggedInDashboard);
    await cards.submitButton.click();
    await assertValidationError(page, "is required");
    await expect(cards.cardNumberInput, "The form should stay open").toBeVisible();
  });

  test("TC_FT_OCC_N03 - Verify that Mismatched Card Number / Re-enter is blocked", async ({ page, loggedInDashboard }) => {
    const cards = await openForm(page, loggedInDashboard);
    await cards.fillPartial({
      fromAccount: neg.base.fromAccount,
      cardNumber: neg.mismatchedCard.cardNumber,
      reCardNumber: neg.mismatchedCard.reCardNumber,
      cardName: neg.base.cardName,
      bank: neg.base.bank,
      amount: neg.base.amount,
    });
    await cards.submitButton.click().catch(() => {});
    await assertValidationError(page, neg.mismatchedCard.expectedError);
  });

  test("TC_FT_OCC_N04 - Verify that Invalid (too-short) card number is rejected", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = neg.invalidCard;
    const cards = await openForm(page, loggedInDashboard);
    await cards.cardNumberInput.fill(data.cardNumber);
    await cards.reCardNumberInput.fill(data.cardNumber);
    await cards.amountInput.fill(data.amount);
    await cards.ensureOneTimeTransaction();

    const enabled = await cards.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await cards.submit();
      await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
    } else {
      await expect(cards.submitButton, "Submit should stay disabled for an invalid card number").toBeDisabled();
    }
  });

  test("TC_FT_OCC_N05 - Verify that Missing Amount is blocked", async ({ page, loggedInDashboard }) => {
    const cards = await openForm(page, loggedInDashboard);
    await cards.fillPartial({
      fromAccount: neg.base.fromAccount,
      cardNumber: neg.base.cardNumber,
      reCardNumber: neg.base.cardNumber,
      cardName: neg.base.cardName,
      bank: neg.base.bank,
    });
    await cards.submitButton.click();
    await assertValidationError(page, neg.requiredFields.amount);
  });

  test("TC_FT_OCC_N06 - Verify that Zero amount is blocked", async ({ page, loggedInDashboard }) => {
    const cards = await openForm(page, loggedInDashboard);
    await cards.fillPartial({
      fromAccount: neg.base.fromAccount,
      cardNumber: neg.base.cardNumber,
      reCardNumber: neg.base.cardNumber,
      cardName: neg.base.cardName,
      bank: neg.base.bank,
      amount: neg.zeroAmount.amount,
    });
    const enabled = await cards.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await cards.submitButton.click();
      await assertValidationError(page, neg.zeroAmount.expectedError);
    } else {
      await expect(cards.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_FT_OCC_N07 - Verify that Non-numeric amount is not accepted", async ({ page, loggedInDashboard }) => {
    const cards = await openForm(page, loggedInDashboard);
    await cards.fillPartial({
      fromAccount: neg.base.fromAccount,
      cardNumber: neg.base.cardNumber,
      reCardNumber: neg.base.cardNumber,
      cardName: neg.base.cardName,
      bank: neg.base.bank,
      amount: neg.nonNumericAmount.amount,
    });
    await cards.submitButton.click();
    await assertValidationError(page, neg.nonNumericAmount.expectedError);
  });

  test("TC_FT_OCC_N08 - Verify that Negative amount is not accepted", async ({ page, loggedInDashboard }) => {
    const cards = await openForm(page, loggedInDashboard);
    await cards.fillPartial({
      fromAccount: neg.base.fromAccount,
      cardNumber: neg.base.cardNumber,
      reCardNumber: neg.base.cardNumber,
      cardName: neg.base.cardName,
      bank: neg.base.bank,
      amount: neg.negativeAmount.amount,
    });
    const raw = await cards.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    await cards.submitButton.click();
    await assertValidationError(page, neg.negativeAmount.expectedError);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
