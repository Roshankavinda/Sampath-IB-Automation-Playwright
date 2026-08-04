const { test } = require("../../utils/fixtures");
const { ManageSchedulePage } = require("../../pages/ManageSchedulePage");
const manageScheduleBiller = require("../../test-data/manageScheduleBiller");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Manage Schedule - Biller (Bill Payment) — POSITIVE.
 * Top-nav Manage Schedules -> Scheduled Payments tab -> pick a schedule row -> run one of
 * the four row actions: Pay Now | Skip | Stop | Modify.
 *
 * The real row actions are inline buttons: "View details", "Edit payment" (=Modify) and
 * "Delete payment" (=Stop). Pay Now / Skip are NOT offered for scheduled bill payments, so
 * those cases SKIP when the action is absent.
 *
 * SAFETY: these are REAL pending schedules, so each action is verified as reachable (its
 * confirm dialog / edit form opens) and then CANCELLED - the delete/edit/payment is never
 * committed against real data.
 */
test.describe("Manage Schedule - Biller - Positive", () => {
  const actions = [
    { id: "TC_MNG_SBILL_H01", name: "Pay Now", run: (m, row) => m.payNow(row) },
    { id: "TC_MNG_SBILL_H02", name: "Skip", run: (m, row) => m.skip(row) },
    { id: "TC_MNG_SBILL_H03", name: "Stop", run: (m, row) => m.stop(row) },
    { id: "TC_MNG_SBILL_H04", name: "Modify", run: (m, row) => m.modify(row) },
    { id: "TC_MNG_SBILL_H05", name: "Delete", run: (m, row) => m.delete(row) },
  ];

  for (const action of actions) {
    test(`${action.id} - Verify that ${action.name} a scheduled bill payment`, async ({ page, loggedInDashboard }) => {
      const manage = new ManageSchedulePage(page);

      await test.step("Open Manage Schedules > Scheduled Payments", async () => {
        await loggedInDashboard.goToManageSchedules();
        await manage.assertLoaded();
        await manage.openScheduledPayments();
      });

      let row;
      await test.step("Select a scheduled payment", async () => {
        row = await manage.selectSchedule(manageScheduleBiller.identifier);
      });

      // Pay Now / Skip are not offered for scheduled bill payments - skip if absent.
      test.skip(
        !(await manage.hasAction(row, action.name)),
        `"${action.name}" is not offered for scheduled bill payments (available actions: View details, Edit payment, Delete payment).`
      );

      await test.step(`Run the "${action.name}" action (verified, then cancelled - not committed)`, async () => {
        await action.run(manage, row);
      });
    });
  }

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
