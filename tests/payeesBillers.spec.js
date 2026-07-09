const { test } = require("../utils/fixtures");
const { PayeesBillersPage } = require("../pages/PayeesBillersPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, newPayee } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

/**
 * Flow: Login -> Payees & Billers -> Add Payee -> fill details -> Save ->
 *       OTP/confirmation -> assert the payee is listed.
 */
test.describe("Payees & Billers", () => {
  test("TC_PAYEE_01 - Login and add a new payee", async ({ page, loggedInDashboard }) => {
    const payees = new PayeesBillersPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Payees & Billers", async () => {
      await loggedInDashboard.goToPayeesAndBillers();
      await payees.assertLoaded();
    });

    await test.step("Start adding a new payee", async () => {
      await payees.startAddPayee();
    });

    await test.step("Fill the payee details", async () => {
      await payees.fillPayee(newPayee);
    });

    await test.step("Save the payee and confirm via OTP if prompted", async () => {
      await payees.save();
      // Adding a payee may require OTP confirmation; handle it when it appears.
      const needsOtp = await popup.otpBoxes
        .first()
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (needsOtp) await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the payee appears in the saved list", async () => {
      await payees.assertPayeeListed(newPayee.nickname);
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const toast = await getToastText(page, 1_500);
      if (toast) await testInfo.attach("last-toast-message", { body: toast, contentType: "text/plain" });
    }
  });
});
