const { test } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { OwnAccountPage } = require("../../pages/OwnAccountPage");
const { OtherBankTransferPage } = require("../../pages/OtherBankTransferPage");
const { ScheduleModal } = require("../../pages/ScheduleModal");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const scheduledTransfer = require("../../test-data/scheduledTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Schedule Payment - Fund Transfer (Standing Order) — POSITIVE.
 * Covers 3 transfer flows x 2 schedule kinds:
 *   Own Account | Intra Bank (Sampath) | Other Bank   x   single (One Time) | recurring (Monthly)
 * Each: fill the transfer -> Standing Order/Schedule -> Submit -> schedule modal ->
 * frequency (+ schedule type / number for recurring) -> Submit -> OTP -> success.
 */

/**
 * Opens the relevant Send Money tab, fills the transfer for `flow`, selects Standing
 * Order/Schedule, and submits to open the schedule modal.
 */
async function openFillAndSubmit(flow, page, loggedInDashboard, data) {
  const sendMoney = new SendMoneyPage(page);
  await loggedInDashboard.goToSendMoney();
  await sendMoney.assertLoaded();

  if (flow === "own") {
    const own = new OwnAccountPage(page);
    await sendMoney.selectOwnAccountTab();
    await own.assertLoaded();
    await own.assertFormValidations();
    await own.fillForm(data);
    await own.selectStandingOrderSchedule();
    await own.submit();
    return;
  }

  // Intra Bank and Other Bank both use the "Other Accounts" form.
  const other = new OtherBankTransferPage(page);
  await sendMoney.selectOtherAccountsTab();
  await other.assertLoaded();
  await other.assertFormValidations();
  await other.selectFromAccount(data.fromAccount);
  await other.selectBank(data.bank);
  if (flow === "intra") {
    await other.enterIntraBankAccount(data.toAccountNumber, data.beneficiaryName); // auto-fetch, else type name
  } else {
    await other.enterToAccountAndBeneficiary(data.toAccountNumber, data.beneficiaryName);
  }
  await other.fillAmountAndDetails(data);
  await other.selectStandingOrderSchedule();
  await other.submit();
}

const flows = [
  { key: "own", code: "OWN", label: "Own Account" },
  { key: "intra", code: "INTRA", label: "Intra Bank (Sampath)" },
  { key: "other", code: "OTHER", label: "Other Bank" },
];
const schedules = [
  { kind: "single", seq: "H01", label: "single (One Time)" },
  { kind: "recurring", seq: "H02", label: "recurring (Monthly)" },
];

test.describe("Schedule Payment - Fund Transfer - Positive", () => {
  for (const flow of flows) {
    for (const sched of schedules) {
      const id = `TC_SCHED_FT_${flow.code}_${sched.seq}`;
      test(`${id} - Schedule a ${sched.label} ${flow.label} transfer`, async ({ page, loggedInDashboard }) => {
        const data = { ...scheduledTransfer[flow.key].base, ...scheduledTransfer[sched.kind] };
        const schedule = new ScheduleModal(page);
        const popup = new ConfirmationPopup(page);

        await test.step(`Open ${flow.label}, fill the transfer and choose Standing Order/Schedule`, async () => {
          await openFillAndSubmit(flow.key, page, loggedInDashboard, data);
        });

        await test.step("Validate the schedule modal", async () => {
          await schedule.assertOpen();
          await schedule.assertFormValidations();
        });

        await test.step(`Set the schedule (${sched.label}) and submit`, async () => {
          await schedule.fill(data);
          await schedule.submit();
        });

        await test.step("Validate the OTP/confirmation popup", async () => {
          await popup.assertVisible();
        });

        await test.step("Enter transaction OTP and confirm", async () => {
          await popup.enterOtpAndConfirm(credentials.otp);
        });

        await test.step("Validate the scheduled-transfer success confirmation", async () => {
          await popup.assertSuccess();
        });
      });
    }
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
