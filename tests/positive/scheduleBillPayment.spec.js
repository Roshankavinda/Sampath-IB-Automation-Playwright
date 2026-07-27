const { test } = require("../../utils/fixtures");
const { BillPaymentPage } = require("../../pages/BillPaymentPage");
const { ScheduleModal } = require("../../pages/ScheduleModal");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const scheduledBillPayment = require("../../test-data/scheduledBillPayment");
const { attachToastOnFailure } = require("../../utils/helpers");
/**
 * Feature: Schedule Payment - Bill Payment (Standing Order) — POSITIVE.
 * Login -> Bill Payment -> category -> biller -> pay-by-account -> reference / amount ->
 * Standing Order/Schedule -> Next -> schedule modal (Start Date defaults to tomorrow) ->
 * frequency (+ number of payments for recurring) -> Submit -> OTP -> success.
 * Runs once for a SINGLE (One Time) and once for a RECURRING (Monthly) schedule.
 */
test.describe("Schedule Payment - Bill Payment - Positive", () => {
  const cases = [
    { id: "TC_SCHED_BILL_H01", label: "single (One Time)", data: scheduledBillPayment.single },
    { id: "TC_SCHED_BILL_H02", label: "recurring (Monthly)", data: scheduledBillPayment.recurring },
  ];

  for (const { id, label, data } of cases) {
    test(`${id} - Schedule a ${label} Dialog bill payment`, async ({ page, loggedInDashboard }) => {
      const billPay = new BillPaymentPage(page);
      const schedule = new ScheduleModal(page);
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

      await test.step("Choose pay-by-account, fill the reference and amount", async () => {
        await billPay.payByAccount(data.fromAccount);
        await billPay.fillReferenceField(data.referenceFieldName, data.referenceValue);
        await billPay.fillAmountIfEditable(data.amount);
      });

      await test.step("Choose Standing Order/Schedule and proceed", async () => {
        await billPay.selectStandingOrderSchedule();
        await billPay.proceed();
      });

      await test.step("Validate the schedule modal", async () => {
        await schedule.assertOpen();
        await schedule.assertFormValidations();
      });

      await test.step(`Set the schedule (${label}) and submit`, async () => {
        await schedule.fill(data);
        await schedule.submit();
      });

      await test.step("Accept terms if shown and validate the OTP/confirmation popup", async () => {
        await billPay.agreeTermsIfPresent();
        await popup.assertVisible();
      });

      await test.step("Enter transaction OTP and confirm", async () => {
        await popup.enterOtpAndConfirm(credentials.otp);
      });

      await test.step("Validate the scheduled-payment success confirmation", async () => {
        await popup.assertSuccess();
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
