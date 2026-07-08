const { test } = require("../utils/fixtures");
const { SendMoneyPage } = require("../pages/SendMoneyPage");
const { OwnAccountPage } = require("../pages/OwnAccountPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, ownTransfer } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

/**
 * Flow: Login -> Own Fund Transfer.
 * Navigation is by clicking; each page is validated by its heading/elements.
 */
test.describe("Own Account Fund Transfer", () => {
  test("TC_OWN_01 - Login and transfer between own accounts (One-time)", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Send Money via Quick Actions", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
    });

    await test.step("Open the 'Own Account' tab and validate the form", async () => {
      await sendMoney.selectOwnAccountTab();
      await ownAccount.assertLoaded();
    });

    await test.step("Fill the own account transfer details", async () => {
      await ownAccount.fillForm(ownTransfer);
    });

    await test.step("Ensure One-time Transaction mode is selected", async () => {
      await ownAccount.ensureOneTimeTransaction();
    });

    await test.step("Submit and validate the OTP/confirmation popup", async () => {
      await ownAccount.submit();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: ownTransfer.amount });
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
