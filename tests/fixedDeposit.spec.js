const { test } = require("../utils/fixtures");
const { FixedDepositPage } = require("../pages/FixedDepositPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, fixedDeposit } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

/**
 * Flow: Login -> Quick Actions -> Fixed Deposit -> fill form -> Submit -> OTP.
 */
test.describe("Fixed Deposit", () => {
  test("TC_FD_01 - Login and open a new Fixed Deposit", async ({ page, loggedInDashboard }) => {
    const fd = new FixedDepositPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Fixed Deposit via Quick Actions", async () => {
      await loggedInDashboard.goToFixedDeposit();
      await fd.assertLoaded();
    });

    await test.step("Fill the Fixed Deposit details", async () => {
      await fd.fillForm(fixedDeposit);
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await fd.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: fixedDeposit.amount });
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the Fixed Deposit success confirmation", async () => {
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
