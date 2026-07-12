const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OtherCreditCardsPage } = require("../../pages/OtherCreditCardsPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, negative } = require("../../test-data/testData");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Other Bank Credit Card — NEGATIVE / VALIDATION.
 * An invalid (too-short) card number must be rejected or keep Submit disabled.
 */
test.describe("Fund Transfer - Other Bank Credit Card - Negative & Validation", () => {
  test("TC_FT_OCC_N01 - Invalid card number is rejected", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const cards = new OtherCreditCardsPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.otherCreditCardTransfer.invalidCard;

    await test.step("Open Send Money > Other Credit Cards", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOtherCreditCardsTab();
      await cards.assertLoaded();
    });

    await test.step("Enter a too-short card number", async () => {
      await cards.cardNumberInput.fill(data.cardNumber);
      await cards.reCardNumberInput.fill(data.cardNumber);
      await cards.amountInput.fill(data.amount);
      await cards.ensureOneTimeTransaction();
    });

    await test.step("Assert the app rejects it or keeps Submit disabled", async () => {
      const enabled = await cards.submitButton.isEnabled().catch(() => false);
      if (enabled) {
        await cards.submit();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(cards.submitButton, "Submit should stay disabled for an invalid card number").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
