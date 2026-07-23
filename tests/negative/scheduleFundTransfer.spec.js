const { test } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OwnAccountPage } = require("../../pages/OwnAccountPage");
const { ScheduleModal } = require("../../pages/ScheduleModal");
const negative = require("../../test-data/negative");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Schedule Payment - Fund Transfer — NEGATIVE / VALIDATION.
 * In the schedule modal, submitting with NO frequency chosen must be blocked and must
 * not reach the OTP step.
 */
test.describe("Schedule Payment - Fund Transfer - Negative & Validation", () => {
  test("TC_SCHED_FT_N01 - Schedule with no frequency is blocked", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    const schedule = new ScheduleModal(page);
    const data = negative.scheduledTransfer.noFrequency;

    await test.step("Open Send Money > Own Account and fill the transfer", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOwnAccountTab();
      await ownAccount.assertLoaded();
      await ownAccount.fillForm(data);
    });

    await test.step("Choose Standing Order/Schedule and open the schedule modal", async () => {
      await ownAccount.selectStandingOrderSchedule();
      await ownAccount.submit();
      await schedule.assertOpen();
    });

    await test.step("Submit without a frequency and assert it is blocked", async () => {
      await schedule.assertFrequencyRequired(data.expectedError);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
