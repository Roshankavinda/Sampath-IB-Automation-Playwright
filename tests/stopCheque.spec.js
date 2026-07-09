const { test } = require("../utils/fixtures");
const { StopChequePage } = require("../pages/StopChequePage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, stopCheque } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

/**
 * Flow: Login -> Quick Actions -> Stop Cheque -> fill form -> Submit -> OTP.
 */
test.describe("Stop Cheque", () => {
  test("TC_STOPCHQ_01 - Login and place a stop-payment on a cheque", async ({ page, loggedInDashboard }) => {
    const stop = new StopChequePage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Stop Cheque via Quick Actions", async () => {
      await loggedInDashboard.goToStopCheque();
      await stop.assertLoaded();
    });

    await test.step("Fill the Stop Cheque details", async () => {
      await stop.fillForm(stopCheque);
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await stop.submit();
      await popup.assertVisible();
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the stop-cheque success confirmation", async () => {
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
