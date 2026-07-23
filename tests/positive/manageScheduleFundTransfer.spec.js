const { test } = require("../../utils/fixtures");
const { ManageSchedulePage } = require("../../pages/ManageSchedulePage");
const manageScheduleTransfer = require("../../test-data/manageScheduleTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Manage Schedule - Fund Transfer — POSITIVE.
 * Top-nav Manage Schedules -> Scheduled Transfers tab -> pick a schedule row -> run one
 * of the four row actions: Pay Now | Skip | Stop | Modify.
 *
 * NOTE: the Scheduled Transfers list is currently empty (schedule creation is rejected by
 * the backend), so each test fails at selectSchedule with a clear "no schedules" message
 * until a scheduled transfer exists.
 */
test.describe("Manage Schedule - Fund Transfer - Positive", () => {
  const actions = [
    { id: "TC_MNG_SFT_H01", name: "Pay Now", run: (m, row) => m.payNow(row) },
    { id: "TC_MNG_SFT_H02", name: "Skip", run: (m, row) => m.skip(row) },
    { id: "TC_MNG_SFT_H03", name: "Stop", run: (m, row) => m.stop(row) },
    { id: "TC_MNG_SFT_H04", name: "Modify", run: (m, row) => m.modify(row) },
  ];

  for (const action of actions) {
    test(`${action.id} - ${action.name} a scheduled fund transfer`, async ({ page, loggedInDashboard }) => {
      const manage = new ManageSchedulePage(page);

      await test.step("Open Manage Schedules > Scheduled Transfers", async () => {
        await loggedInDashboard.goToManageSchedules();
        await manage.assertLoaded();
        await manage.openScheduledTransfers();
      });

      let row;
      await test.step("Select a scheduled transfer", async () => {
        row = await manage.selectSchedule(manageScheduleTransfer.identifier);
      });

      await test.step(`Run the "${action.name}" action`, async () => {
        await action.run(manage, row);
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
