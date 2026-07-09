const { test } = require("../utils/fixtures");
const { SendMoneyPage } = require("../pages/SendMoneyPage");
const { OwnAccountPage } = require("../pages/OwnAccountPage");
const { ManageSchedulesPage } = require("../pages/ManageSchedulesPage");
const { ConfirmationPopup } = require("../pages/ConfirmationPopup");
const { credentials, scheduledTransfer } = require("../test-data/testData");
const { getToastText, offsetDate } = require("../utils/helpers");

/**
 * Flow 1: Login -> Send Money -> Own Account -> fill form -> Scheduled mode
 *         (future date) -> Submit -> OTP -> success -> verify in Manage Schedules.
 * Flow 2: Same but Recurring (frequency + end date).
 */
test.describe("Scheduled & Recurring Transfers", () => {
  test("TC_SCHED_01 - Schedule a future-dated own account transfer", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    const schedules = new ManageSchedulesPage(page);
    const popup = new ConfirmationPopup(page);
    const effectiveDate = offsetDate(scheduledTransfer.baseDate, scheduledTransfer.effectiveInDays);

    await test.step("Navigate to Send Money > Own Account", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOwnAccountTab();
      await ownAccount.assertLoaded();
    });

    await test.step("Fill the transfer details", async () => {
      await ownAccount.fillForm(scheduledTransfer);
    });

    await test.step(`Select Scheduled mode with effective date ${effectiveDate}`, async () => {
      await ownAccount.setTransferMode("scheduled", { effectiveDate });
    });

    await test.step("Submit and confirm via OTP", async () => {
      await ownAccount.submit();
      await popup.assertVisible();
      await popup.enterOtpAndConfirm(credentials.otp);
      await popup.assertSuccess();
    });

    await test.step("Verify the schedule appears under Manage Schedules", async () => {
      await loggedInDashboard.goToManageSchedules();
      await schedules.assertLoaded();
      await schedules.assertScheduleListed(scheduledTransfer.beneficiaryRemark);
    });
  });

  test("TC_SCHED_02 - Set up a recurring own account transfer", async ({ page, loggedInDashboard }) => {
    const sendMoney = new SendMoneyPage(page);
    const ownAccount = new OwnAccountPage(page);
    const schedules = new ManageSchedulesPage(page);
    const popup = new ConfirmationPopup(page);
    const effectiveDate = offsetDate(scheduledTransfer.baseDate, scheduledTransfer.effectiveInDays);
    const endDate = offsetDate(scheduledTransfer.baseDate, scheduledTransfer.endInDays);

    await test.step("Navigate to Send Money > Own Account", async () => {
      await loggedInDashboard.goToSendMoney();
      await sendMoney.assertLoaded();
      await sendMoney.selectOwnAccountTab();
      await ownAccount.assertLoaded();
    });

    await test.step("Fill the transfer details", async () => {
      await ownAccount.fillForm(scheduledTransfer);
    });

    await test.step(`Select Recurring mode (${scheduledTransfer.frequency}, ${effectiveDate} -> ${endDate})`, async () => {
      await ownAccount.setTransferMode("recurring", {
        effectiveDate,
        endDate,
        frequency: scheduledTransfer.frequency,
      });
    });

    await test.step("Submit and confirm via OTP", async () => {
      await ownAccount.submit();
      await popup.assertVisible();
      await popup.enterOtpAndConfirm(credentials.otp);
      await popup.assertSuccess();
    });

    await test.step("Verify the recurring schedule appears under Manage Schedules", async () => {
      await loggedInDashboard.goToManageSchedules();
      await schedules.assertLoaded();
      await schedules.assertScheduleListed(scheduledTransfer.beneficiaryRemark);
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const toast = await getToastText(page, 1_500);
      if (toast) await testInfo.attach("last-toast-message", { body: toast, contentType: "text/plain" });
    }
  });
});
