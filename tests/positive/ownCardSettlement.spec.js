const { test } = require("../../utils/fixtures");
const { OwnCardSettlementPage } = require("../../pages/OwnCardSettlementPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const ownCardSettlement = require("../../test-data/ownCardSettlement");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Own Card Settlement — POSITIVE.
 * Login -> My Accounts > Credit Cards -> select the card -> Settle ->
 * funding account / amount -> Submit -> OTP -> success.
 */
test.describe("Own Card Settlement - Positive", () => {
  test("TC_OCS_H01 - Settle own credit card", async ({ page, loggedInDashboard }) => {
    const settle = new OwnCardSettlementPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to My Accounts > Credit Cards", async () => {
      await loggedInDashboard.goToCreditCards();
      await settle.assertLoaded();
    });

    await test.step("Select the credit card", async () => {
      await settle.selectCard(ownCardSettlement.card);
    });

    await test.step("Open the Settle flow and fill the settlement details", async () => {
      await settle.clickSettle();
      await settle.assertFormValidations();
      await settle.fillSettlement(ownCardSettlement);
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await settle.submit();
      await popup.assertVisible();
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the settlement success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
