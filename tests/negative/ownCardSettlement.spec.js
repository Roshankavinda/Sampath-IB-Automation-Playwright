const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OwnCardSettlementPage } = require("../../pages/OwnCardSettlementPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, negative } = require("../../test-data/testData");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Own Card Settlement — NEGATIVE / VALIDATION.
 * An "Other Amount" of zero must be rejected or keep Submit disabled.
 */
test.describe("Own Card Settlement - Negative & Validation", () => {
  test("TC_OCS_N01 - Zero settlement amount is blocked", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const settle = new OwnCardSettlementPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.ownCardSettlement.zeroAmount;

    await test.step("Open Send Money > Own Cards", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOwnCardsTab();
      await settle.assertLoaded();
    });

    await test.step("Choose 'Other Amount' and enter zero", async () => {
      await settle.fillForm(data);
      await settle.ensureOneTimeTransaction();
    });

    await test.step("Assert the app rejects it or keeps Submit disabled", async () => {
      const enabled = await settle.submitButton.isEnabled().catch(() => false);
      if (enabled) {
        await settle.submit();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(settle.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
