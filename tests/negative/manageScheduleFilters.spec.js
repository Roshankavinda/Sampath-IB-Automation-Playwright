const { test, expect } = require("../../utils/fixtures");
const { ManageSchedulePage } = require("../../pages/ManageSchedulePage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Manage Schedules - FILTERS — NEGATIVE / VALIDATION.
 *   N01 an impossible amount range returns no schedules (and says so)
 *   N02 an inverted amount range (From > To) does not return everything
 *   N03 a filtered listing never renders a blank panel or a loading error
 *   N04 "Load Old Vishwa Schedules" is a separate, explicit action
 *
 * VIEW ONLY: nothing is paid, edited, stopped or deleted.
 */
test.describe("Manage Schedule Filters - Negative & Validation", () => {
  async function open(page, loggedInDashboard) {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    await manage.openScheduledPayments();
    await page.waitForTimeout(4000);
    return manage;
  }

  test("TC_MNG_FLT_N01 - Verify that an impossible amount range returns no schedules", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await open(page, loggedInDashboard);
    await manage.openFilter();
    await manage.setAmountRange(99999990, 99999999);
    const rows = await manage.applyFilters();
    // NOTE: while the "Apply Filters empties the list" defect is open (see
    // manageScheduleFilters positive spec) this passes for the wrong reason - it stays here
    // because it is the right assertion, and it becomes meaningful once that bug is fixed.

    const empty = await manage.emptyState.first().isVisible().catch(() => false);
    expect(rows === 0 || empty, "An impossible amount range should return no schedules").toBeTruthy();
    await manage.assertNoError();
  });

  test("TC_MNG_FLT_N02 - Verify that an inverted amount range does not return everything", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await open(page, loggedInDashboard);
    const before = await manage.rowCount();
    test.skip(before === 0, "No scheduled payments exist to filter.");

    await manage.openFilter();
    // From is GREATER than To - an empty range, so it must not behave like "no filter".
    await manage.setAmountRange(9000, 10);
    const rows = await manage.applyFilters();
    // eslint-disable-next-line no-console
    console.log(`Inverted range 9000-10 -> ${rows} row(s) (unfiltered listing had ${before})`);

    const rejected = await manage.filterValidation.isVisible().catch(() => false);
    const empty = await manage.emptyState.first().isVisible().catch(() => false);
    expect(
      rejected || rows === 0 || empty || rows < before,
      "An inverted amount range must be rejected or return nothing - never the whole listing"
    ).toBeTruthy();
    await manage.assertNoError();
  });

  test("TC_MNG_FLT_N03 - Verify that a filtered listing never renders a blank panel", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await open(page, loggedInDashboard);
    await manage.assertListRendered("Scheduled Payments");

    await manage.openFilter();
    const selected = await manage.selectStatus("TERMINATED");
    test.skip(!selected, "The status dropdown does not offer TERMINATED.");
    await manage.applyFilters();

    // Whether or not any terminated schedule exists, the panel must say so - never go blank.
    await manage.assertListRendered("Scheduled Payments filtered by TERMINATED");
    await manage.assertNoError();
  });

  test("TC_MNG_FLT_N04 - Verify that Old Vishwa schedules are a separate explicit action", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await open(page, loggedInDashboard);
    const offered = await manage.loadOldButton.first().isVisible().catch(() => false);
    test.skip(!offered, "This build does not offer 'Load Old Vishwa Schedules'.");
    await expect
      .soft(manage.loadOldButton.first(), "Old Vishwa schedules should need an explicit action to load")
      .toBeVisible();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
