const { test } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OwnCardSettlementPage } = require("../../pages/OwnCardSettlementPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, ownCardSettlement } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Own Card Settlement — HAPPY PATH.
 * Login -> Send Money -> Own Cards -> funding account -> card -> settlement type ->
 * amount (if Other Amount) -> Submit -> OTP -> success.
 */
test.describe("Own Card Settlement - Happy Path", () => {
  test("TC_OCS_H01 - Settle own credit card (One-time)", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const settle = new OwnCardSettlementPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Send Money via Quick Actions", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
    });

    await test.step("Open the 'Own Cards' tab and validate the form", async () => {
      await sendMoney.selectOwnCardsTab();
      await settle.assertLoaded();
    });

    await test.step("Fill the own card settlement details", async () => {
      await settle.fillForm(ownCardSettlement);
    });

    await test.step("Ensure One-time Transaction mode is selected", async () => {
      await settle.ensureOneTimeTransaction();
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
