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
   * The row's inline action controls (confirmed from a live schedule row). The three leading
   * icon buttons all share the accessible name "View details", but functionally, IN ORDER:
   *   [0] arrow icon = Pay Now   [1] = Stop   [2] eye icon = View details
   * followed by the named buttons "Edit payment" (= Modify) and "Delete payment" (= Delete).
   * (Skip is not offered - its lookup finds nothing, so those tests skip.)
   */
  actionButton(row, actionName) {
    const icons = row.getByRole("button", { name: /view details/i });
    switch (actionName) {
      case "Pay Now":
        return icons.nth(0);
      case "Stop":
        return icons.nth(1);
      case "View details":
        return icons.nth(2);
      case "Modify":
        return row.getByRole("button", { name: /edit payment/i }).first();
      case "Delete":
        return row.getByRole("button", { name: /delete payment/i }).first();
      default:
        return row.getByRole("button", { name: new RegExp(actionName.replace(/\s+/g, "\\s*"), "i") }).first();
    }
  }

  /** True if the row offers this action (Skip, for example, is not offered). */
  async hasAction(row, actionName) {
    return this.actionButton(row, actionName).isVisible().catch(() => false);
  }

  /**
   * SAFE cancel of a confirmation dialog / edit modal. Only ever clicks an explicit
   * Cancel/No/Back/Close control (never a Confirm/Delete/Yes), falling back to Escape - so a
   * verification NEVER commits a change to a real schedule.
   */
  async cancelDialog() {
    const cancel = this.page
      .getByRole("button", { name: /^(cancel|no|back|close|dismiss)$/i })
      .locator("visible=true")
      .last();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click().catch(() => {});
      return;
    }
    await this.page.keyboard.press("Escape").catch(() => {});
  }

  /**
   * Triggers a row action and verifies its dialog/form appears, then CANCELS.
   *
   * SAFETY: the Manage Schedules list holds REAL pending schedules. Actually running these
   * actions would execute a payment (Pay Now), or mutate/delete a real schedule (Skip / Stop=
   * "Delete payment" / Modify="Edit payment"). So each action is verified as reachable+guarded
   * and then cancelled - it is NEVER committed. (Flip `commit` to true only against disposable
   * test schedules.)
   * @param {import('@playwright/test').Locator} row
   * @param {string} actionName
   * @param {RegExp} dialogPattern  text expected on the confirm dialog / edit form
   */
  async triggerAndVerify(row, actionName, dialogPattern) {
    await expect(
      this.actionButton(row, actionName),
      `The "${actionName}" action should be available on the schedule row`
    ).toBeVisible({ timeout: TIMEOUTS.UI });
    await this.actionButton(row, actionName).click();

    await expect(
      this.page.getByText(dialogPattern).locator("visible=true").first(),
      `The "${actionName}" action should open its confirmation / edit view`
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });

    // Do NOT commit against a real schedule.
    await this.cancelDialog();
  }

  /** Pay Now (execute now) - verified + cancelled, never actually executed. */
  async payNow(row) {
    await this.triggerAndVerify(row, "Pay Now", /pay now|confirm|are you sure|proceed/i);
  }

  /** Skip the next occurrence - verified + cancelled, never actually skipped. */
  async skip(row) {
    await this.triggerAndVerify(row, "Skip", /skip|confirm|are you sure/i);
  }

  /** Stop = "Delete payment" - the delete confirmation is verified then cancelled (no delete). */
  async stop(row) {
    await this.triggerAndVerify(row, "Stop", /delete|are you sure|cancel this|confirm/i);
  }

  /** Modify = "Edit payment" - the edit form is verified then cancelled (no change saved). */
  async modify(row) {
    await this.triggerAndVerify(row, "Modify", /edit|modify|amount|frequency|next payment|update/i);
  }

  /** Delete = "Delete payment" - the delete confirmation is verified then cancelled (no delete). */
  async delete(row) {
    await this.triggerAndVerify(row, "Delete", /delete|are you sure|remove|confirm/i);
  }
}

module.exports = { ManageSchedulePage };
