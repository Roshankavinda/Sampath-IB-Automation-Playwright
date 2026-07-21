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
      await mobile.assertFormValidations();
    });

    // Filling + submitting the form has no side effect until the OTP is confirmed, so if the
    // app intermittently bounces back to the Dashboard before the OTP popup shows, we can
    // safely reopen the form and resubmit until the confirmation popup appears.
    const fillMobileCashForm = async () => {
      await mobile.fillForm(mobileCash);
      await mobile.ensureOneTimeTransaction();
    };
    const reopenMobileCashForm = async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectMobileCashTab();
      await mobile.assertLoaded();
      await fillMobileCashForm();
    };

    await test.step("Fill the Mobile Cash details", async () => {
      await fillMobileCashForm();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt > 1) await reopenMobileCashForm(); // previous attempt bounced to the Dashboard
        await mobile.submit();
        if ((await popup.waitForOutcome()) !== "bounce") break; // otp/error/timeout -> assertVisible reports it
      }
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
