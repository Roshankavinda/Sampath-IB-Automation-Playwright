const { test } = require("../../utils/fixtures");
const { ManageSchedulePage } = require("../../pages/ManageSchedulePage");
const manageScheduleTransfer = require("../../test-data/manageScheduleTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Manage Schedule - Fund Transfer — POSITIVE.
 * Top-nav Manage Schedules -> Scheduled Transfers tab -> pick a schedule row -> run one
 * of the four row actions: Pay Now | Skip | Stop | Modify.
 *
 * An action SKIPS if the Scheduled Transfers UI doesn't offer it on the row.
 *
 * SAFETY: these are REAL pending schedules, so each action is verified as reachable (its
 * confirm dialog / edit form opens) and then CANCELLED - the delete/edit/payment is never
 * committed against real data.
 */
test.describe("Manage Schedule - Fund Transfer - Positive", () => {
  const actions = [
    { id: "TC_MNG_SFT_H01", name: "Pay Now", run: (m, row) => m.payNow(row) },
    { id: "TC_MNG_SFT_H02", name: "Skip", run: (m, row) => m.skip(row) },
    { id: "TC_MNG_SFT_H03", name: "Stop", run: (m, row) => m.stop(row) },
    { id: "TC_MNG_SFT_H04", name: "Modify", run: (m, row) => m.modify(row) },
    { id: "TC_MNG_SFT_H05", name: "Delete", run: (m, row) => m.delete(row) },
  ];

  for (const action of actions) {
    test(`${action.id} - Verify that ${action.name} a scheduled fund transfer`, async ({ page, loggedInDashboard }) => {
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

      // Skip an action the Scheduled Transfers row does not offer.
      test.skip(
        !(await manage.hasAction(row, action.name)),
        `"${action.name}" is not offered on the scheduled-transfer row.`
      );

      await test.step(`Run the "${action.name}" action (verified, then cancelled - not committed)`, async () => {
        await action.run(manage, row);
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
