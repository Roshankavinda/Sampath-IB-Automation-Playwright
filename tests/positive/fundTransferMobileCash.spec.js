const { test } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { MobileCashPage } = require("../../pages/MobileCashPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, mobileCash } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Mobile Cash — POSITIVE.
 * Login -> Send Money -> Mobile Cash -> From -> Mobile Number -> Amount ->
 * One-time -> Submit -> OTP -> success.
 */
test.describe("Fund Transfer - Mobile Cash - Positive", () => {
  test("TC_FT_MCASH_H01 - Send Mobile Cash to a mobile number (One-time)", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const mobile = new MobileCashPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Send Money via Quick Actions", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
    });

    await test.step("Open the 'Mobile Cash' tab and validate the form", async () => {
      await sendMoney.selectMobileCashTab();
      await mobile.assertLoaded();
    });

    await test.step("Fill the Mobile Cash details", async () => {
      await mobile.fillForm(mobileCash);
    });

    await test.step("Ensure One-time Transaction mode is selected", async () => {
      await mobile.ensureOneTimeTransaction();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await mobile.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: mobileCash.amount });
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the transaction success confirmation", async () => {
      await popup.assertSuccess();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
