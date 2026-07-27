const { test, expect } = require("../../utils/fixtures");
const { OwnCardSettlementPage } = require("../../pages/OwnCardSettlementPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const negative = require("../../test-data/negative");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Own Card Settlement — NEGATIVE / VALIDATION.
 * A "Custom Amount" of zero must be rejected: the app raises the inline message
 * "Custom amount must be greater than 0.00" as soon as the amount is entered, and the
 * settlement must never reach the OTP step.
 */
test.describe("Own Card Settlement - Negative & Validation", () => {
  test("TC_OCS_N01 - Zero settlement amount is blocked", async ({ page, loggedInDashboard }) => {
    const settle = new OwnCardSettlementPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.ownCardSettlement.zeroAmount;

    await test.step("Navigate to My Accounts > Credit Cards and open Settle", async () => {
      await loggedInDashboard.goToCreditCards();
      await settle.assertLoaded();
      await settle.selectCard(data.card);
      await settle.clickSettle();
    });

    await test.step("Choose 'Custom Amount' and enter zero", async () => {
      await settle.fillSettlement(data);
    });

    await test.step("Validate the zero amount is rejected inline", async () => {
      // Asserted BEFORE Next: clicking Next closes the modal and clears the message.
      await settle.assertAmountValidationShown(data.expectedError);
    });

    await test.step("Validate the settlement never reaches the OTP step", async () => {
      await expect(popup.otpBoxes.first(), "No OTP should be requested for a zero settlement amount").toBeHidden();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
