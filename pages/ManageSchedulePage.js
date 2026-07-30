const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Manage Schedules — Schedule Management page (top-nav "Manage Schedules",
 * /dashboard/manage-schedule). Two tabs: "Scheduled Transfers" and "Scheduled Payments".
 * Each schedule row exposes actions: Pay Now, Skip, Stop, Modify
 * ("Manage single transfer elements by tapping on actions.").
 *
 * CONFIRMED against the live app: the page, its heading, the two tabs, and that both tabs
 * are currently EMPTY (0 rows; "Load Old Vishwa Schedules" -> "No data found").
 *
 * // VERIFY: the schedule row structure and the Pay Now / Skip / Stop / Modify controls
 * // could NOT be observed because no schedules exist (creating one is rejected by the
 * // backend "Session TimeOut" wall). The row/action selectors below are best-effort and
 * // must be confirmed against a real scheduled item.
 */
class ManageSchedulePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/schedule management/i).first();
    // Tabs. These labels also exist as hidden nav-dropdown items, so match only visible.
    this.scheduledTransfersTab = page.getByText("Scheduled Transfers", { exact: true }).locator("visible=true").first();
    this.scheduledPaymentsTab = page.getByText("Scheduled Payments", { exact: true }).locator("visible=true").first();
    this.rows = page.locator("table tbody tr");
    this.emptyState = page.getByText(/no data found|no scheduled|no records/i);
    this.filterButton = page.getByRole("button", { name: /^filter$/i });
    this.loadOldButton = page.getByRole("button", { name: /load old vishwa schedules/i });
  }

  /** ASSERTION: the Schedule Management page with both tabs is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Schedule Management' heading should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await expect(this.scheduledTransfersTab, "'Scheduled Transfers' tab should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.scheduledPaymentsTab, "'Scheduled Payments' tab should be visible").toBeVisible();
  }

  async openScheduledTransfers() {
    await this.scheduledTransfersTab.click();
  }

  async openScheduledPayments() {
    await this.scheduledPaymentsTab.click();
  }

  /**
   * Finds a schedule row (by a partial match, or the first row). Throws an actionable
   * error when the list is empty - which it currently always is.
   * @param {string} [identifier] partial text to match a specific schedule row
   */
  async selectSchedule(identifier) {
    const outcome = await Promise.race([
      this.rows.first().waitFor({ state: "visible", timeout: TIMEOUTS.LOAD }).then(() => "rows").catch(() => null),
      this.emptyState.first().waitFor({ state: "visible", timeout: TIMEOUTS.LOAD }).then(() => "empty").catch(() => null),
    ]);

    if (outcome !== "rows") {
      throw new Error(
        "There are no scheduled items to manage: the Manage Schedules list is empty. Creating a schedule is rejected " +
          'by the backend ("Session TimeOut" on submit), so no schedule exists to run Pay Now / Skip / Stop / Modify ' +
          "against. Provide (or create) a scheduled transfer/payment first, then this flow can be finalized."
      );
    }

    const row = identifier ? this.rows.filter({ hasText: identifier }).first() : this.rows.first();
    await expect(row, `A schedule row matching "${identifier || "(first)"}" should be listed`).toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    return row;
  }

  /**
   * Runs a row action (Pay Now | Skip | Stop | Modify). The action may be an inline button
   * or an item inside a per-row actions menu, so try both.
   * // VERIFY against a real schedule row.
   * @param {import('@playwright/test').Locator} row
   * @param {string} actionName
   */
  async runAction(row, actionName) {
    const pattern = new RegExp(actionName.replace(/\s+/g, "\\s*"), "i");

    // 1) Inline action control within the row.
    let control = row.getByRole("button", { name: pattern }).or(row.getByText(pattern)).first();
    if (!(await control.isVisible().catch(() => false))) {
      // 2) Otherwise open a per-row actions menu (kebab / "Actions") then click the item.
      const menu = row.getByRole("button", { name: /action|menu|more|options|manage/i }).first();
      if (await menu.isVisible().catch(() => false)) await menu.click().catch(() => {});
      control = this.page
        .getByRole("menuitem", { name: pattern })
        .or(this.page.getByText(pattern).locator("visible=true"))
        .first();
    }

    await expect(control, `The "${actionName}" action should be available on the schedule row`).toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await control.click();
  }

  /**
   * Confirms an action that raises a confirmation dialog (Stop/Skip typically do).
   * Non-fatal if there is no dialog. // VERIFY the confirm control against a real dialog.
   */
  async confirmAction() {
    const confirm = this.page
      .getByRole("button", { name: /confirm|^yes\b|proceed|^ok$|confirm & /i })
      .locator("visible=true")
      .last();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
  }

  /** Pay Now: execute the scheduled transaction immediately. */
  async payNow(row) {
    await this.runAction(row, "Pay Now");
    await this.confirmAction();
  }

  /** Skip: skip the next occurrence of a recurring schedule. */
  async skip(row) {
    await this.runAction(row, "Skip");
    await this.confirmAction();
  }

  /** Stop: cancel the schedule entirely. */
  async stop(row) {
    await this.runAction(row, "Stop");
    await this.confirmAction();
  }

  /** Modify: open the schedule for editing. */
  async modify(row) {
    await this.runAction(row, "Modify");
  }
}

module.exports = { ManageSchedulePage };
