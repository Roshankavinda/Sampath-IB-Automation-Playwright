const { test } = require("../utils/fixtures");
const { SendMoneyPage } = require("../pages/SendMoneyPage");
const { SavedPayeesPage } = require("../pages/SavedPayeesPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, savedPayeeTransfer } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

/**
 * Flow: Login -> Send Money -> Saved Payees -> pick a saved payee ->
 *       From Account -> Amount -> One-time -> Submit -> OTP.
 *
 * Prerequisite: the payee named `savedPayeeTransfer.payeeName` must already exist
 * (run TC_PAYEE_01 first, or seed it manually in the UAT profile).
 */
test.describe("Saved Payee Transfer", () => {
  test("TC_SAVED_01 - Login and transfer to a saved payee (One-time)", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const saved = new SavedPayeesPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Send Money via Quick Actions", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
    });

    await test.step("Open the 'Saved Payees' tab and validate the list", async () => {
      await sendMoney.selectSavedPayeesTab();
      await saved.assertLoaded();
    });

    await test.step(`Select the saved payee "${savedPayeeTransfer.payeeName}"`, async () => {
      await saved.selectPayee(savedPayeeTransfer.payeeName);
    });

    await test.step("Fill the From account, amount and remark", async () => {
      await saved.fillForm(savedPayeeTransfer);
    });

    await test.step("Ensure One-time Transaction mode is selected", async () => {
      await saved.ensureOneTimeTransaction();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await saved.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: savedPayeeTransfer.amount });
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
