const { test, expect } = require("../../utils/fixtures");
const { ManageSchedulePage } = require("../../pages/ManageSchedulePage");
const manageScheduleTransfer = require("../../test-data/manageScheduleTransfer");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Manage Schedule - Fund Transfer — NEGATIVE / VALIDATION.
 *   N01 the Scheduled Transfers list shows rows or an explicit empty state
 *   N02 cancelling "Delete" does NOT remove the schedule
 *   N03 cancelling "Edit" does NOT change the schedule
 *
 * SAFETY: these are REAL pending schedules - every action is opened and then CANCELLED,
 * so nothing is ever deleted or modified.
 */
test.describe("Manage Schedule - Fund Transfer - Negative & Validation", () => {
  async function openScheduledTransfers(page, loggedInDashboard) {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    await manage.openScheduledTransfers();
    return manage;
  }

  test("TC_MNG_SFT_N01 - Verify that the schedule list shows rows or an empty state", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await openScheduledTransfers(page, loggedInDashboard);
    const rows = await manage.rows.count().catch(() => 0);
    const empty = await manage.emptyState.first().isVisible().catch(() => false);
    expect(
      rows > 0 || empty,
      "Scheduled Transfers must show either schedule rows or an explicit empty state"
    ).toBeTruthy();
  });

  test("TC_MNG_SFT_N02 - Verify that cancelling Delete does not remove the schedule", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await openScheduledTransfers(page, loggedInDashboard);
    const before = await manage.rows.count().catch(() => 0);
    test.skip(before === 0, "No scheduled transfers exist to exercise the delete guard.");

    const row = await manage.selectSchedule(manageScheduleTransfer.identifier);
    await manage.delete(row); // opens the confirmation, then cancels
    await page.waitForTimeout(2000);

    const after = await manage.rows.count().catch(() => 0);
    expect(after, "Cancelling the delete confirmation must NOT remove the schedule").toBe(before);
  });

  test("TC_MNG_SFT_N03 - Verify that cancelling Edit does not change the schedule", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await openScheduledTransfers(page, loggedInDashboard);
    const rows = await manage.rows.count().catch(() => 0);
    test.skip(rows === 0, "No scheduled transfers exist to exercise the edit guard.");

    const row = await manage.selectSchedule(manageScheduleTransfer.identifier);
    const before = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();

    await manage.modify(row); // opens the edit form, then cancels
    await page.waitForTimeout(2000);

    const rowAgain = await manage.selectSchedule(manageScheduleTransfer.identifier);
    const after = (await rowAgain.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    expect(after, "Cancelling the edit form must leave the schedule unchanged").toBe(before);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
