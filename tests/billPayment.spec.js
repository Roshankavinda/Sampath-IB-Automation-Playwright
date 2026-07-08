const { test } = require("../utils/fixtures");
const { BillPaymentPage } = require("../pages/BillPaymentPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, billPayment } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

/**
 * Flow: Login -> Quick Actions -> Bill Payment -> New Payment (All Categories)
 *       -> select Cable - TV -> select Dialog TV -> fill form -> Proceed to Pay -> OTP.
 */
test.describe("Bill Payment", () => {
  test("TC_BILL_01 - Login and pay a Cable TV (Dialog TV) bill by account", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    const popup = new ConfirmationPopup(page);

    await test.step("Navigate to Bill Payment via Quick Actions", async () => {
      await loggedInDashboard.goToBillPayment();
      await billPay.assertLoaded();
    });

    await test.step(`Select the "${billPayment.category}" category under All Categories`, async () => {
      await billPay.selectCategory(billPayment.category);
    });

    await test.step(`Select the "${billPayment.biller}" biller and validate the payment form`, async () => {
      await billPay.selectBiller(billPayment.biller);
    });

    await test.step("Choose pay-by-account and select the From account", async () => {
      await billPay.payByAccount(billPayment.fromAccount);
    });

    await test.step(`Fill the reference field (${billPayment.referenceFieldName})`, async () => {
      await billPay.fillReferenceField(billPayment.referenceFieldName, billPayment.referenceValue);
    });

    await test.step("Fill the amount (when editable) and keep One-time mode", async () => {
      await billPay.fillAmountIfEditable(billPayment.amount);
      await billPay.ensureOneTimeTransaction();
    });

    await test.step("Proceed to Pay, accept terms and validate the OTP/confirmation popup", async () => {
      await billPay.proceed();
      await billPay.agreeTermsIfPresent();
      await popup.assertVisible();
      await popup.verifyDetails({ amount: billPayment.amount });
    });

    await test.step("Enter transaction OTP and confirm", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the payment success confirmation", async () => {
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