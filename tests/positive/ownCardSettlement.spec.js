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
 *
 * TC_OCS_H01 funds the settlement from an LKR account; TC_OCS_H02 funds it from a FOREIGN
 * CURRENCY account (chosen from the same "Account" dropdown). The FCY funding account is a
 * partial label match set in test-data/ownCardSettlement.json -> foreignCurrency.fromAccount
 * (defaults to "USD" - change it to your actual foreign-currency account if needed).
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

  test("TC_OCS_H02 - Settle own credit card by foreign currency account", async ({ page, loggedInDashboard }) => {
    const settle = new OwnCardSettlementPage(page);
    const popup = new ConfirmationPopup(page);
    const fcy = ownCardSettlement.foreignCurrency;

    await test.step("Navigate to My Accounts > Credit Cards", async () => {
      await loggedInDashboard.goToCreditCards();
      await settle.assertLoaded();
    });

    await test.step("Select the credit card", async () => {
      await settle.selectCard(fcy.card);
    });

    await test.step("Open the Settle flow and fund it from the FOREIGN CURRENCY account", async () => {
      await settle.clickSettle();
      await settle.assertFormValidations();
      // fillSettlement selects fcy.fromAccount ("USD") in the funding "Account" dropdown and
      // soft-asserts the selected option contains it, so a wrong FCY account is reported clearly.
      await settle.fillSettlement(fcy);
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
