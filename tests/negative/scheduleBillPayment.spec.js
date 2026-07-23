const { test } = require("../../utils/fixtures");
const { BillPaymentPage } = require("../../pages/BillPaymentPage");
const { ScheduleModal } = require("../../pages/ScheduleModal");
const negative = require("../../test-data/negative");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Schedule Payment - Bill Payment — NEGATIVE / VALIDATION.
 * In the schedule modal, submitting with NO frequency chosen must be blocked and must
 * not reach the OTP step.
 */
test.describe("Schedule Payment - Bill Payment - Negative & Validation", () => {
  test("TC_SCHED_BILL_N01 - Schedule with no frequency is blocked", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    const schedule = new ScheduleModal(page);
    const data = negative.scheduledBillPayment.noFrequency;

    await test.step("Open Bill Payment and select the Dialog biller", async () => {
      await loggedInDashboard.goToBillPayment();
      await billPay.assertLoaded();
      await billPay.selectCategory(data.category);
      await billPay.selectBiller(data.biller);
    });

    await test.step("Fill the payment details", async () => {
      await billPay.payByAccount(data.fromAccount);
      await billPay.fillReferenceField(data.referenceFieldName, data.referenceValue);
      await billPay.fillAmountIfEditable(data.amount);
    });

    await test.step("Choose Standing Order/Schedule and open the schedule modal", async () => {
      await billPay.selectStandingOrderSchedule();
      await billPay.proceed();
      await schedule.assertOpen();
    });

    await test.step("Submit without a frequency and assert it is blocked", async () => {
      await schedule.assertFrequencyRequired(data.expectedError);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
