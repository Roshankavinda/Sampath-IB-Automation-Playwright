const { test } = require("../utils/fixtures");
const { SendMoneyPage } = require("../pages/SendMoneyPage");
const { OtherCreditCardsPage } = require("../pages/OtherCreditCardsPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, otherCreditCardTransfer } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

/**
 * Flow: Login -> Send Money -> Other Credit Cards ->
 *       From Account -> Card Number -> Amount -> One-time -> Submit -> OTP.
 */
test.describe("Other Credit Cards Payment", () => {
  test("TC_CARD_01 - Login and pay a credit card (One-time)", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const cards = new OtherCreditCardsPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Send Money via Quick Actions", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
    });

    await test.step("Open the 'Other Credit Cards' tab and validate the form", async () => {
      await sendMoney.selectOtherCreditCardsTab();
      await cards.assertLoaded();
    });

    await test.step("Fill the credit card payment details", async () => {
      await cards.fillForm(otherCreditCardTransfer);
    });

    await test.step("Ensure One-time Transaction mode is selected", async () => {
      await cards.ensureOneTimeTransaction();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await cards.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: otherCreditCardTransfer.amount });
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the transaction success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const toast = await getToastText(page, 1_500);
      if (toast) await testInfo.attach("last-toast-message", { body: toast, contentType: "text/plain" });
    }
  });
});
