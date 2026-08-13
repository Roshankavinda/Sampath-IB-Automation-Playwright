const { test, expect } = require("../../utils/fixtures");
const { ManageSchedulePage } = require("../../pages/ManageSchedulePage");
const manageScheduleBiller = require("../../test-data/manageScheduleBiller");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Manage Schedule - Biller — NEGATIVE / VALIDATION.
 *   N01 the Scheduled Payments list shows rows or an explicit empty state
 *   N02 cancelling "Delete payment" does NOT remove the schedule
 *   N03 cancelling "Edit payment" does NOT change the schedule
 *   N04 actions the UI does not offer are absent (no Skip on bill payments)
 *
 * SAFETY: these are REAL pending schedules - every action is opened and then CANCELLED,
 * so nothing is ever deleted or modified.
 */
test.describe("Manage Schedule - Biller - Negative & Validation", () => {
  async function openScheduledPayments(page, loggedInDashboard) {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    await manage.openScheduledPayments();
    return manage;
  }

  test("TC_MNG_SBILL_N01 - Verify that the schedule list shows rows or an empty state", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await openScheduledPayments(page, loggedInDashboard);
    const rows = await manage.rows.count().catch(() => 0);
    const empty = await manage.emptyState.first().isVisible().catch(() => false);
    expect(
      rows > 0 || empty,
      "Scheduled Payments must show either schedule rows or an explicit empty state"
    ).toBeTruthy();
  });

  test("TC_MNG_SBILL_N02 - Verify that cancelling Delete does not remove the schedule", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await openScheduledPayments(page, loggedInDashboard);
    const before = await manage.rows.count().catch(() => 0);
    test.skip(before === 0, "No scheduled payments exist to exercise the delete guard.");

    const row = await manage.selectSchedule(manageScheduleBiller.identifier);
    // Opens the delete confirmation and cancels it - nothing is deleted.
    await manage.delete(row);
    await page.waitForTimeout(2000);

    const after = await manage.rows.count().catch(() => 0);
    expect(after, "Cancelling the delete confirmation must NOT remove the schedule").toBe(before);
  });

  test("TC_MNG_SBILL_N03 - Verify that cancelling Edit does not change the schedule", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await openScheduledPayments(page, loggedInDashboard);
    const rows = await manage.rows.count().catch(() => 0);
    test.skip(rows === 0, "No scheduled payments exist to exercise the edit guard.");

    const row = await manage.selectSchedule(manageScheduleBiller.identifier);
    const before = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").trim();

    // Opens the edit form and cancels it - nothing is saved.
    await manage.modify(row);
    await page.waitForTimeout(2000);

    const rowAgain = await manage.selectSchedule(manageScheduleBiller.identifier);
    const after = (await rowAgain.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    expect(after, "Cancelling the edit form must leave the schedule unchanged").toBe(before);
  });

  test("TC_MNG_SBILL_N04 - Verify that unsupported actions are not offered on a schedule row", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await openScheduledPayments(page, loggedInDashboard);
    const rows = await manage.rows.count().catch(() => 0);
    test.skip(rows === 0, "No scheduled payments exist to inspect their actions.");

    const row = await manage.selectSchedule(manageScheduleBiller.identifier);
    // "Skip" is not part of the scheduled bill-payment row actions.
    const hasSkip = await manage.hasAction(row, "Skip");
    expect(hasSkip, "A 'Skip' action should not be offered for scheduled bill payments").toBeFalsy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
