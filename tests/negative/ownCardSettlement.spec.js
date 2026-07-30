const { test, expect } = require("../../utils/fixtures");
const { OwnCardSettlementPage } = require("../../pages/OwnCardSettlementPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const negative = require("../../test-data/negative");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Own Card Settlement — NEGATIVE / VALIDATION.
 *   N01 zero "Custom Amount" is rejected inline and never reaches OTP
 *   N02 the funding-account dropdown displays selectable values
 *   N03 negative "Custom Amount" is not accepted
 */
test.describe("Own Card Settlement - Negative & Validation", () => {
  const neg = negative.ownCardSettlement;

  async function openSettle(page, loggedInDashboard) {
    const settle = new OwnCardSettlementPage(page);
    await loggedInDashboard.goToCreditCards();
    await settle.assertLoaded();
    await settle.selectCard(neg.card);
    await settle.clickSettle();
    return settle;
  }

  test("TC_OCS_N02 - Verify that Funding account dropdown displays selectable values", async ({ page, loggedInDashboard }) => {
    const settle = await openSettle(page, loggedInDashboard);
    await settle.assertFormValidations();
  });

  test("TC_OCS_N03 - Verify that Negative custom amount is not accepted", async ({ page, loggedInDashboard }) => {
    const settle = await openSettle(page, loggedInDashboard);
    await settle.fillSettlement(neg.negativeAmount);
    const raw = await settle.customAmountInput.inputValue().catch(() => "");
    expect(raw, "The custom amount must not retain a negative value").not.toContain("-");
    await settle.assertAmountValidationShown(neg.negativeAmount.expectedError);
  });

  test("TC_OCS_N01 - Verify that Zero settlement amount is blocked", async ({ page, loggedInDashboard }) => {
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
