const { test } = require("../../utils/fixtures");
const { BillPaymentPage } = require("../../pages/BillPaymentPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const billPayments = require("../../test-data/billPayments");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Bill Payment (Dialog & Mobitel only) — POSITIVE.
 * Login -> Bill Payment -> category -> biller -> pay-by-account -> reference ->
 * amount -> Proceed -> OTP -> success. Runs once for Dialog and once for Mobitel.
 */
test.describe("Bill Payment - Positive", () => {
  const cases = [
    { id: "TC_BILL_H01", label: "Dialog", data: billPayments.dialog },
    { id: "TC_BILL_H02", label: "Mobitel", data: billPayments.mobitel },
  ];

  for (const { id, label, data } of cases) {
    test(`${id} - Verify that Pay a ${label} bill by account`, async ({ page, loggedInDashboard }) => {
      const billPay = new BillPaymentPage(page);
      const popup = new ConfirmationPopup(page);

      await test.step("Navigate to Bill Payment via Quick Actions", async () => {
        await loggedInDashboard.goToBillPayment();
        await billPay.assertLoaded();
        await billPay.assertCategoriesDisplayed();
      });

      await test.step(`Select the "${data.category}" category`, async () => {
        await billPay.selectCategory(data.category);
      });

      await test.step(`Select the "${data.biller}" biller and validate the payment form`, async () => {
        await billPay.selectBiller(data.biller);
        await billPay.assertPaymentFormValidations();
      });

      await test.step("Choose pay-by-account and select the From account", async () => {
        await billPay.payByAccount(data.fromAccount);
      });

      await test.step(`Fill the reference field (${data.referenceFieldName})`, async () => {
        await billPay.fillReferenceField(data.referenceFieldName, data.referenceValue);
      });

      await test.step("Fill the amount (when editable) and keep One-time mode", async () => {
        await billPay.fillAmountIfEditable(data.amount);
        await billPay.ensureOneTimeTransaction();
      });

      await test.step("Proceed to Pay, accept terms and validate the OTP/confirmation popup", async () => {
        await billPay.proceed();
        await billPay.agreeTermsIfPresent();
        await popup.assertVisible();
        await popup.verifyDetails({ amount: data.amount });
      });

      await test.step("Enter transaction OTP and confirm", async () => {
        await popup.enterOtpAndConfirm(credentials.otp);
      });

      await test.step("Validate the payment success confirmation", async () => {
        await popup.assertSuccess();
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
