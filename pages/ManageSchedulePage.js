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
    // The app renders hidden duplicates of this text, so .first() can latch onto an invisible
    // copy that never becomes visible - restrict to VISIBLE matches.
    this.emptyState = page.getByText(/no data found|no scheduled|no records/i).locator("visible=true");
    this.filterButton = page.getByRole("button", { name: /^filter$/i });
    this.loadOldButton = page.getByRole("button", { name: /load old vishwa schedules/i });

    // ---- Filter panel (opens INLINE, shared by both tabs) ----
    // Confirmed live. None of its controls carry a name attribute, so they are matched by
    // placeholder; the two amount fields share the placeholder "Enter Amount" (from / to).
    this.filterFromAccountInput = page.getByPlaceholder("From Account");
    this.filterAmountFromInput = page.getByPlaceholder("Enter Amount").first();
    this.filterAmountToInput = page.getByPlaceholder("Enter Amount").last();
    // The panel holds the only <select> on the screen: PENDING | COMPLETED | TERMINATED.
    this.filterStatusSelect = page.locator("select").locator("visible=true").first();
    this.filterDateInput = page.getByPlaceholder("Transaction Date");
    this.applyFiltersButton = page.getByRole("button", { name: /apply filters/i }).first();
    this.clearFiltersButton = page.getByRole("button", { name: /^clear$/i }).first();
    this.filterValidation = page
      .getByText(/should be less than|invalid|required|greater than/i)
      .locator("visible=true")
      .first();
    this.errorState = page
      .getByText(/error loading|failed to load|something went wrong/i)
      .locator("visible=true")
      .first();
  }

  /** ASSERTION: the Schedule Management page with both tabs is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Schedule Management' heading should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await expect(this.scheduledTransfersTab, "'Scheduled Transfers' tab should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.scheduledPaymentsTab, "'Scheduled Payments' tab should be visible").toBeVisible();
  }

  /**
   * Waits for a schedule tab to finish loading.
   *
   * The "Filter" button is DISABLED while the schedules are being fetched - the app's own
   * loading signal, and a far more reliable gate than watching for rows (which never arrive
   * when a tab genuinely holds no schedules).
   */
  async waitForListReady() {
    for (let i = 0; i < 25; i++) {
      if (!(await this.filterButton.first().isDisabled().catch(() => true))) break;
      await this.page.waitForTimeout(1000);
    }
    for (let i = 0; i < 8; i++) {
      const rows = await this.rowCount();
      const empty = await this.emptyState.first().isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    await this.page.waitForTimeout(800);
  }

  /**
   * Opens a schedule tab and waits for its list.
   *
   * The tab is re-clicked when nothing renders: the list is fetched intermittently and the
   * first click is sometimes swallowed, which otherwise leaves the table empty and makes
   * every data-driven test skip against an account that really does hold schedules.
   */
  async openTab(tabLocator) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await tabLocator.click({ force: true }).catch(() => {});
      await this.waitForListReady();
      if ((await this.rowCount()) > 0) return;
      // Accept a genuine empty state, but only after giving the fetch a second chance.
      if (attempt > 0 && (await this.emptyState.first().isVisible().catch(() => false))) return;
    }
  }

  async openScheduledTransfers() {
    await this.openTab(this.scheduledTransfersTab);
  }

  /** Columns of the Scheduled Payments table (confirmed live). */
  static get PAYMENT_COLUMNS() {
    return [
      "Reference ID",
      "Biller Name",
      "Pay From",
      "Start Date",
      "Next Payment Date",
      "Schedule Frequency",
      "Status",
      "Amount",
      "Action",
    ];
  }

  /** Columns of the Scheduled TRANSFERS table (confirmed live). */
  static get TRANSFER_COLUMNS() {
    return [
      "Reference ID",
      "From Account",
      "To Account",
      "Next Transfer Date",
      "Scheduled Date",
      "Transfer Type",
      "Status",
      "Transfer Amount",
      "Actions",
    ];
  }

  /**
   * The Scheduled TRANSFERS filter narrows by TRANSFER TYPE (not status, as the Payments
   * filter does) - confirmed live.
   */
  static get TRANSFER_TYPES() {
    return ["All", "Credit Card", "Own Account Transfer", "Other Sampath", "Other Bank Transfer"];
  }

  /** The statuses the filter offers. */
  static get STATUSES() {
    return ["PENDING", "COMPLETED", "TERMINATED"];
  }

  async openScheduledPayments() {
    await this.openTab(this.scheduledPaymentsTab);
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

  // ---- Listing helpers ----

  /** How many schedule rows are listed. */
  async rowCount() {
    return this.rows.count().catch(() => 0);
  }

  /** SOFT ASSERTIONS: the Scheduled Payments table shows all its columns. */
  async assertPaymentColumns() {
    for (const header of ManageSchedulePage.PAYMENT_COLUMNS) {
      await expect
        .soft(this.page.getByRole("columnheader", { name: new RegExp(header, "i") }).first(), `Column "${header}"`)
        .toBeVisible();
    }
  }

  /** SOFT ASSERTIONS: the Scheduled TRANSFERS table shows all its columns. */
  async assertTransferColumns() {
    for (const header of ManageSchedulePage.TRANSFER_COLUMNS) {
      await expect
        .soft(this.page.getByRole("columnheader", { name: new RegExp(header, "i") }).first(), `Column "${header}"`)
        .toBeVisible();
    }
  }

  /** The columns expected for a tab ("transfers" | "payments"). */
  async assertColumnsFor(tab) {
    return /transfer/i.test(tab) ? this.assertTransferColumns() : this.assertPaymentColumns();
  }

  /** ASSERTION: rows or an explicit empty state - never a blank panel. Returns the count. */
  async assertListRendered(label) {
    let rows = 0;
    let empty = false;
    for (let i = 0; i < 12; i++) {
      rows = await this.rowCount();
      empty = await this.emptyState.first().isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    expect(rows > 0 || empty, `"${label}" should list schedules or show an explicit empty state`).toBeTruthy();
    return rows;
  }

  /** ASSERTION: no loading error is shown. */
  async assertNoError() {
    await expect(this.errorState, "Manage Schedules must not show a loading error").toBeHidden();
  }

  /** The text of one cell of a row (0-based, in PAYMENT_COLUMNS order). */
  async cellText(rowIndex, columnIndex) {
    return this.rows
      .nth(rowIndex)
      .getByRole("cell")
      .nth(columnIndex)
      .innerText()
      .then((t) => t.replace(/\s+/g, " ").trim())
      .catch(() => "");
  }

  /** Every row's Status cell (column 6 on Scheduled Payments). */
  async statuses() {
    const n = await this.rowCount();
    const out = [];
    for (let i = 0; i < n; i++) out.push(await this.cellText(i, 6));
    return out;
  }

  /** Every row's Amount as a number (column 7), currency prefix stripped. */
  async amounts() {
    const n = await this.rowCount();
    const out = [];
    for (let i = 0; i < n; i++) {
      const num = Number((await this.cellText(i, 7)).replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(num)) out.push(num);
    }
    return out;
  }

  /** The first row's text - used to prove a filter changed (or restored) the listing. */
  async firstRowText() {
    return this.rows
      .first()
      .innerText()
      .then((t) => t.replace(/\s+/g, " ").trim())
      .catch(() => "");
  }

  // ---- Filter ----

  /**
   * Opens the inline filter panel. The panel is confirmed by its "From Account" field
   * rather than by a caption, and the first click is occasionally swallowed, so it retries.
   */
  async openFilter() {
    const filter = this.filterButton.first();
    await expect(filter, "The Filter button should be available").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await expect(filter, "The Filter button should be enabled once the schedules load").toBeEnabled({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      await filter.click().catch(() => {});
      const opened = await this.filterFromAccountInput
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (opened) return;
    }
    await expect(this.filterFromAccountInput, "The filter panel should open when Filter is clicked").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** SOFT ASSERTIONS: the filter panel offers all of its controls. */
  async assertFilterControls() {
    await expect.soft(this.filterFromAccountInput, "'From Account' should be offered").toBeVisible();
    await expect.soft(this.filterAmountFromInput, "An amount-from field should be offered").toBeVisible();
    await expect.soft(this.filterAmountToInput, "An amount-to field should be offered").toBeVisible();
    await expect.soft(this.filterStatusSelect, "The status dropdown should be offered").toBeVisible();
    await expect.soft(this.filterDateInput, "'Transaction Date' should be offered").toBeVisible();
    await expect.soft(this.applyFiltersButton, "'Apply Filters' should be offered").toBeVisible();
    await expect.soft(this.clearFiltersButton, "'Clear' should be offered").toBeVisible();
  }

  /** The statuses the dropdown actually offers. */
  async statusOptions() {
    return this.filterStatusSelect
      .locator("option")
      .allInnerTexts()
      .then((v) => v.map((t) => t.trim()).filter(Boolean))
      .catch(() => []);
  }

  /** Sets the status filter. Returns false when that status is not offered. */
  async selectStatus(status) {
    const options = await this.statusOptions();
    const match = options.find((o) => o.toLowerCase() === String(status).toLowerCase());
    if (!match) return false;
    await this.filterStatusSelect.selectOption({ label: match }).catch(() => {});
    return true;
  }

  /** Sets the amount range. */
  async setAmountRange(from, to) {
    if (from !== undefined) await this.filterAmountFromInput.fill(String(from)).catch(() => {});
    if (to !== undefined) await this.filterAmountToInput.fill(String(to)).catch(() => {});
  }

  /** Applies the filter. A filter can legitimately return zero rows, so this settles on a
   *  stable row count instead of waiting for rows to appear. */
  async applyFilters() {
    await expect(this.applyFiltersButton, "'Apply Filters' should be clickable").toBeVisible({ timeout: TIMEOUTS.UI });
    await this.applyFiltersButton.click({ force: true });
    let previous = -1;
    for (let i = 0; i < 10; i++) {
      await this.page.waitForTimeout(1000);
      const rows = await this.rowCount();
      if (rows === previous) return rows;
      previous = rows;
    }
    return previous;
  }

  /** Clears the filter and waits for the listing to settle. */
  async clearFilters() {
    if (!(await this.clearFiltersButton.isVisible().catch(() => false))) return false;
    await this.clearFiltersButton.click({ force: true });
    let previous = -1;
    for (let i = 0; i < 10; i++) {
      await this.page.waitForTimeout(1000);
      const rows = await this.rowCount();
      if (rows === previous) break;
      previous = rows;
    }
    return true;
  }
}

module.exports = { ManageSchedulePage };
