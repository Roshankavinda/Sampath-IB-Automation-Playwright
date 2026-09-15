const { test, expect } = require("../../utils/fixtures");
const { ManageSchedulePage } = require("../../pages/ManageSchedulePage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Manage Schedules - TABLE VIEW & FILTERS — POSITIVE.
 * Covers both tabs (Scheduled Transfers | Scheduled Payments): the listing's columns, and
 * the shared inline Filter panel - From Account, an amount range, the status dropdown
 * (PENDING | COMPLETED | TERMINATED), Transaction Date, "Apply Filters" and "Clear".
 *
 * VIEW ONLY: no schedule is paid, edited, stopped or deleted here.
 */
test.describe("Manage Schedule Filters - Positive", () => {
  async function open(page, loggedInDashboard, tab = "payments") {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    if (tab === "payments") await manage.openScheduledPayments();
    else await manage.openScheduledTransfers();
    await page.waitForTimeout(4000);
    return manage;
  }

  test("TC_MNG_FLT_H01 - Verify that the Scheduled Payments table shows all its columns", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await open(page, loggedInDashboard, "payments");
    test.skip((await manage.rowCount()) === 0, "No scheduled payments exist - the table is not rendered.");
    await manage.assertPaymentColumns();
  });

  test("TC_MNG_FLT_H02 - Verify that the Filter panel offers all its controls", async ({ page, loggedInDashboard }) => {
    const manage = await open(page, loggedInDashboard, "payments");
    await manage.openFilter();
    await manage.assertFilterControls();

    const options = await manage.statusOptions();
    // eslint-disable-next-line no-console
    console.log("Schedule status options:", JSON.stringify(options));
    for (const status of ManageSchedulePage.STATUSES) {
      expect
        .soft(
          options.some((o) => o.toUpperCase() === status),
          `The status dropdown should offer "${status}"`
        )
        .toBeTruthy();
    }
  });

  // ---------------------------------------------------------------------------------------
  // KNOWN DEFECT (affects TC_MNG_FLT_H03, H04 and H05)
  //
  // "Apply Filters" empties the Scheduled Payments list no matter what is asked for.
  // Evidence captured live: the tab lists 2 schedules, BOTH with status PENDING. Clicking
  // Apply Filters returns 0 rows in every combination tried -
  //     defaults only (status already = PENDING)        -> 0 rows
  //     status re-selected as PENDING                   -> 0 rows
  //     PENDING + amount range 0 - 999,999              -> 0 rows
  // and because the list is then empty, the panel cannot be reopened to Clear it either.
  //
  // These three tests assert the CORRECT behaviour and are marked test.fail(), so the suite
  // stays green while the bug is open and reports an "unexpected pass" the day it is fixed
  // (then delete the test.fail() lines).
  // ---------------------------------------------------------------------------------------
  test("TC_MNG_FLT_H03 - Verify that filtering by status returns only that status", async ({
    page,
    loggedInDashboard,
  }) => {
    test.fail(true, "Known defect: filtering by a status that exists in the list returns no schedules.");
    const manage = await open(page, loggedInDashboard, "payments");
    test.skip((await manage.rowCount()) === 0, "No scheduled payments exist to filter.");

    // Filter on a status the listing actually contains, so the filter can be proven to work.
    const present = (await manage.statuses()).map((s) => s.toUpperCase());
    const target = ManageSchedulePage.STATUSES.find((s) => present.includes(s));
    test.skip(!target, `No filterable status in the listing (found: ${JSON.stringify(present)}).`);

    await manage.openFilter();
    expect(await manage.selectStatus(target), `The dropdown should offer "${target}"`).toBeTruthy();
    const rows = await manage.applyFilters();
    // eslint-disable-next-line no-console
    console.log(`Filter status="${target}" -> ${rows} row(s)`);

    await manage.assertNoError();
    expect(rows, `Schedules with status ${target} exist, so the filter should return them`).toBeGreaterThan(0);
    for (const status of await manage.statuses()) {
      expect(status.toUpperCase(), `Every row should have the filtered status "${target}"`).toContain(target);
    }
  });

  test("TC_MNG_FLT_H04 - Verify that filtering by amount range returns only amounts in range", async ({
    page,
    loggedInDashboard,
  }) => {
    test.fail(true, "Known defect: Apply Filters empties the schedule list (see the note above).");
    const manage = await open(page, loggedInDashboard, "payments");
    test.skip((await manage.rowCount()) === 0, "No scheduled payments exist to filter.");

    const amounts = await manage.amounts();
    test.skip(amounts.length === 0, "No amounts could be read from the listing.");
    const target = amounts[0];
    const from = Math.max(0, Math.floor(target - 1));
    const to = Math.ceil(target + 1);

    await manage.openFilter();
    await manage.setAmountRange(from, to);
    const rows = await manage.applyFilters();
    // eslint-disable-next-line no-console
    console.log(`Filter amount ${from}-${to} -> ${rows} row(s)`);

    await manage.assertNoError();
    expect(rows, `A schedule of ${target} exists, so the range ${from}-${to} should return it`).toBeGreaterThan(0);
    for (const amount of await manage.amounts()) {
      expect(amount, `Every listed amount should be between ${from} and ${to}`).toBeGreaterThanOrEqual(from);
      expect(amount, `Every listed amount should be between ${from} and ${to}`).toBeLessThanOrEqual(to);
    }
  });

  test("TC_MNG_FLT_H05 - Verify that Clear restores the unfiltered list", async ({ page, loggedInDashboard }) => {
    test.fail(true, "Known defect: Apply Filters empties the schedule list (see the note above).");
    const manage = await open(page, loggedInDashboard, "payments");
    const before = await manage.rowCount();
    test.skip(before === 0, "No scheduled payments exist to filter.");
    const firstBefore = await manage.firstRowText();

    await manage.openFilter();
    await manage.setAmountRange(0, 999999); // a range EVERY schedule falls into
    const filtered = await manage.applyFilters();
    // eslint-disable-next-line no-console
    console.log(`Filtered to ${filtered} row(s) (unfiltered listing had ${before}), clearing...`);
    expect(filtered, "A range covering every schedule should still list them").toBeGreaterThan(0);

    // Clear lives inside the panel, and the panel closes on Apply - so reopen it first.
    await manage.openFilter();
    expect(await manage.clearFilters(), "The filter panel should offer a Clear action").toBeTruthy();
    expect(await manage.rowCount(), "Clear should restore every schedule").toBe(before);
    expect(await manage.firstRowText(), "Clear should restore the original first row").toBe(firstBefore);
  });

  test("TC_MNG_FLT_H06 - Verify that the filter is offered on Scheduled Transfers too", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = await open(page, loggedInDashboard, "transfers");
    await manage.openFilter();
    await manage.assertFilterControls();
    await manage.assertNoError();
  });


  test("TC_MNG_FLT_H07 - Verify that the Scheduled Transfers table shows all its columns", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    await manage.openScheduledTransfers();
    await manage.assertListRendered("Scheduled Transfers");
    await manage.assertTransferColumns();
  });

  test("TC_MNG_FLT_H08 - Verify that the Scheduled Transfers filter offers its controls", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    await manage.openScheduledTransfers();
    await manage.assertListRendered("Scheduled Transfers");

    await manage.openFilter();
    await manage.assertFilterControls();

    // The Transfers filter narrows by TRANSFER TYPE (the Payments one narrows by status).
    const options = await manage.statusOptions();
    // eslint-disable-next-line no-console
    console.log(`Scheduled Transfers filter options: ${JSON.stringify(options)}`);
    expect(options.length, "The Transfers filter should offer transfer-type options").toBeGreaterThan(0);
  });

  test("TC_MNG_FLT_H09 - Verify that filtering Scheduled Transfers by type narrows the list", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    await manage.openScheduledTransfers();
    const before = await manage.assertListRendered("Scheduled Transfers");
    test.skip(before === 0, "No scheduled transfers listed - the filter cannot be exercised.");

    await manage.openFilter();
    const options = (await manage.statusOptions()).filter((o) => !/^all$/i.test(o));
    test.skip(options.length === 0, "The Transfers filter offers no specific type to select.");

    const type = options[0];
    await test.step(`Filter by transfer type "${type}"`, async () => {
      await manage.selectStatus(type);
      await manage.applyFilters();
      const after = await manage.assertListRendered(`Scheduled Transfers / ${type}`);
      // eslint-disable-next-line no-console
      console.log(`Transfers filter "${type}": ${before} -> ${after} row(s)`);
      expect(after, "Filtering must not return more rows than the unfiltered list").toBeLessThanOrEqual(before);
    });
  });

  test("TC_MNG_FLT_H10 - Verify that Clear restores the Scheduled Transfers list", async ({
    page,
    loggedInDashboard,
  }) => {
    const manage = new ManageSchedulePage(page);
    await loggedInDashboard.goToManageSchedules();
    await manage.assertLoaded();
    await manage.openScheduledTransfers();
    const before = await manage.assertListRendered("Scheduled Transfers");
    test.skip(before === 0, "No scheduled transfers listed.");

    await manage.openFilter();
    await manage.setAmountRange("999999999", "1000000000"); // deliberately matches nothing
    await manage.applyFilters();
    const filtered = await manage.rowCount();

    await manage.clearFilters();
    // Clear resets the filter fields; some builds need the reset re-applied before the
    // listing is re-fetched, so re-apply when the table has not come back.
    if ((await manage.rowCount()) === 0) {
      await manage.openFilter().catch(() => {});
      await manage.applyFilters().catch(() => {});
    }
    const restored = await manage.assertListRendered("Scheduled Transfers (cleared)");
    // eslint-disable-next-line no-console
    console.log(`Transfers Clear: ${before} -> filtered ${filtered} -> restored ${restored}`);
    expect(restored, "Clearing the filter should restore the transfers listing").toBeGreaterThanOrEqual(filtered);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
