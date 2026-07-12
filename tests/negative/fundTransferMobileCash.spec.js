const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { MobileCashPage } = require("../../pages/MobileCashPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials, negative } = require("../../test-data/testData");
const { attachToastOnFailure, submitAndExpectRejection } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Mobile Cash — NEGATIVE / VALIDATION.
 * An invalid (too-short) mobile number must be rejected or keep Submit disabled.
 */
test.describe("Fund Transfer - Mobile Cash - Negative & Validation", () => {
  test("TC_FT_MCASH_N01 - Invalid mobile number is rejected", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const mobile = new MobileCashPage(page);
    const popup = new ConfirmationPopup(page);
    const data = negative.mobileCash.invalidMobile;

    await test.step("Open Send Money > Mobile Cash", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectMobileCashTab();
      await mobile.assertLoaded();
    });

    await test.step("Fill the form with a too-short mobile number", async () => {
      await mobile.fillForm(data);
    });

    await test.step("Assert the app rejects it or keeps Submit disabled", async () => {
      const enabled = await mobile.submitButton.isEnabled().catch(() => false);
      if (enabled) {
        await mobile.submit();
        await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
      } else {
        await expect(mobile.submitButton, "Submit should stay disabled for an invalid mobile number").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
