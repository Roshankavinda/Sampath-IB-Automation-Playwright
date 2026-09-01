const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Bill Payment History — Payees & Billers > Saved Billers > "Bill Payment History" tab
 * (on /dashboard/billpayment). All selectors confirmed against the live app.
 *
 * Screen: heading "Bill Payment History" / "Fetch all your payments", a "Filter" button,
 * the payment table, a numbered pager, and an "Old Vishwa Inquiry" panel
 * ("Currently viewing payments from New Vishwa." + "Load Old Vishwa History").
 *
 * Columns (7): Payment ID | Biller Title | Pay From | Status | Date & Time | Amount | Actions
 *
 * Paging: 10 rows per page; the pager is a row of NUMBER SPANS ("1 2 3") under the table -
 * they are <span> elements, not buttons, so they are matched with :text-is().
 *
 * Filter panel ("Filter Payment History / Change variables to filter your payments") - it
 * opens INLINE (not as a modal) and holds:
 *   input[placeholder="Amount From"]  (number)
 *   input[placeholder="Amount To"]    (number)
 *   select                            Payment Status: All | SUCCESS | FAILED | STOPPED |
 *                                     PENDING | FAILED IN PROCESS
 *   input[placeholder="Payment Date"] (text + calendar)
 *   button "Apply Filters"
 *
 * Row action: a single REPEAT icon (repeat.png) = RE-PAYMENT. Clicking it switches to the
 * "New Payment" tab with the payment form pre-filled from that payment (Pay From account and
 * Amount carried over, savedBiller ticked); the biller reference and its re-enter twin are
 * left EMPTY and must be typed again, so a re-payment is never one click away from executing.
 */
class BillPaymentHistoryPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // The tab, and the subtitle that uniquely identifies the screen (the tab label itself
    // also exists as a nav item, so the subtitle is what assertLoaded() checks).
    this.tab = page.getByRole("button", { name: /bill payment history/i }).first();
    this.heading = page.getByText(/fetch all your payments/i).first();

    this.rows = page.locator("table tbody tr");
    this.emptyState = page.getByText(/no .*(payments?|data|records|history|found)/i).locator("visible=true").first();
    this.errorState = page
      .getByText(/error loading|failed to load|something went wrong/i)
      .locator("visible=true")
      .first();

    // ---- Filter (inline panel) ----
    this.filterButton = page.getByRole("button", { name: /^filter$/i }).first();
    // NOTE: the panel's "Filter Payment History" caption is split across elements, so it is
    // not a reliable locator - the panel is identified by its Amount From field instead.
    this.filterSubHeading = page.getByText(/change variables to filter your payments/i).first();
    this.amountFromInput = page.getByPlaceholder("Amount From");
    this.amountToInput = page.getByPlaceholder("Amount To");
    // The panel holds the only <select> on the screen (Payment Status).
    this.statusSelect = page.locator("select").locator("visible=true").first();
    this.paymentDateInput = page.getByPlaceholder("Payment Date");
    this.applyFiltersButton = page.getByRole("button", { name: /apply filters/i }).first();
    // The panel's own validation, e.g. "From amount should be less than To amount."
    this.filterValidation = page
      .getByText(/should be less than|invalid|required|greater than/i)
      .locator("visible=true")
      .first();

    // ---- Old Vishwa ----
    this.oldVishwaNote = page.getByText(/currently viewing payments from new vishwa/i).first();
    this.loadOldVishwaButton = page.getByRole("button", { name: /load old vishwa history/i }).first();
  }

  /** The 7 confirmed column headers. */
  static get COLUMNS() {
    return ["Payment ID", "Biller Title", "Pay From", "Status", "Date & Time", "Amount", "Actions"];
  }

  /** The statuses the filter offers. */
  static get STATUSES() {
    return ["All", "SUCCESS", "FAILED", "STOPPED", "PENDING", "FAILED IN PROCESS"];
  }

  /** Opens Payees & Billers > Saved Billers > Bill Payment History. */
  async open(dashboard) {
    await dashboard.goToSavedBillers();
    await this.page.waitForTimeout(2500);

    // The history is fetched intermittently and can come back empty; re-clicking the tab
    // re-fetches it, so give it a few attempts before settling for whatever is on screen.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.tab.click({ force: true }).catch(() => {});
      await this.waitForListReady();
      if ((await this.rowCount()) > 0) break;
      if (await this.emptyState.isVisible().catch(() => false)) break;
    }
    await this.assertLoaded();
  }

  /** ASSERTION: the Bill Payment History screen is displayed. */
  async assertLoaded() {
    await expect(this.heading, "The Bill Payment History heading should be shown").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
  }

  /**
   * Waits for the table to settle.
   *
   * The "Filter" button is DISABLED while the payments are being fetched - that is the app's
   * own loading signal, so it is a far more reliable gate than watching for rows (which never
   * arrive when the account genuinely has no payments).
   */
  async waitForListReady() {
    for (let i = 0; i < 25; i++) {
      if (!(await this.filterButton.isDisabled().catch(() => true))) break;
      await this.page.waitForTimeout(1000);
    }
    for (let i = 0; i < 10; i++) {
      const rows = await this.rowCount();
      const empty = await this.emptyState.isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    await this.page.waitForTimeout(800);
  }

  /** SOFT ASSERTIONS: every column header is displayed. */
  async assertColumns() {
    for (const header of BillPaymentHistoryPage.COLUMNS) {
      await expect
        .soft(
          this.page.getByRole("columnheader", { name: new RegExp(header.replace("&", "&"), "i") }).first(),
          `Column "${header}"`
        )
        .toBeVisible();
    }
  }

  /** How many payment rows are listed. */
  async rowCount() {
    return this.rows.count().catch(() => 0);
  }

  /** ASSERTION: rows or an explicit empty state - never a blank panel. Returns the count. */
  async assertListRendered(label) {
    let rows = 0;
    let empty = false;
    for (let i = 0; i < 15; i++) {
      rows = await this.rowCount();
      empty = await this.emptyState.isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    expect(rows > 0 || empty, `"${label}" should list payments or show an explicit empty state`).toBeTruthy();
    return rows;
  }

  /** ASSERTION: no loading error is shown. */
  async assertNoError() {
    await expect(this.errorState, "Bill Payment History must not show a loading error").toBeHidden();
  }

  /** The text of one cell of a row (0-based, in COLUMNS order). */
  async cellText(rowIndex, columnIndex) {
    return this.rows
      .nth(rowIndex)
      .getByRole("cell")
      .nth(columnIndex)
      .innerText()
      .then((t) => t.replace(/\s+/g, " ").trim())
      .catch(() => "");
  }

  /** Every row's Status cell. */
  async statuses() {
    const n = await this.rowCount();
    const out = [];
    for (let i = 0; i < n; i++) out.push(await this.cellText(i, 3));
    return out;
  }

  /** Every row's Amount cell, as numbers (currency prefix stripped, e.g. "LKR 1,580.00" -> 1580). */
  async amounts() {
    const n = await this.rowCount();
    const out = [];
    for (let i = 0; i < n; i++) {
      const raw = await this.cellText(i, 5);
      const num = Number(raw.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(num)) out.push(num);
    }
    return out;
  }

  /** The first row's text - used to prove the page really changed when paging. */
  async firstRowText() {
    return this.rows
      .first()
      .innerText()
      .then((t) => t.replace(/\s+/g, " ").trim())
      .catch(() => "");
  }

  // ---- Pagination (numbered <span>s under the table) ----

  /** The pager link for a page number. */
  pageLink(n) {
    return this.page.locator(`span:text-is("${n}")`).last();
  }

  /** How many numbered pages the pager offers (checks 1..10). */
  async pageCount() {
    let count = 0;
    for (let n = 1; n <= 10; n++) {
      if (await this.pageLink(n).isVisible().catch(() => false)) count = n;
      else break;
    }
    return count;
  }

  /** Goes to a page number. Returns false when that page is not offered. */
  async goToPage(n) {
    const link = this.pageLink(n);
    if (!(await link.isVisible().catch(() => false))) return false;
    await link.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(4000);
    await this.waitForListReady();
    return true;
  }

  // ---- Filter ----

  /**
   * Opens the inline filter panel.
   *
   * The panel is confirmed by its "Amount From" field, NOT by its "Filter Payment History"
   * caption: that caption is split across elements in the DOM, so a text match on the whole
   * phrase finds nothing even while the panel is on screen.
   */
  async openFilter() {
    await expect(this.filterButton, "The Filter button should be available").toBeVisible({ timeout: TIMEOUTS.LOAD });
    // It stays DISABLED until the payments have loaded - clicking before then does nothing.
    await expect(this.filterButton, "The Filter button should become enabled once the payments load").toBeEnabled({
      timeout: TIMEOUTS.SLOW_LOAD,
    });

    // The panel occasionally swallows the first click (the app attaches its handler late),
    // so retry until the panel's own Amount From field is on screen.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.filterButton.click().catch(() => {});
      const opened = await this.amountFromInput
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (opened) return;
    }
    await expect(this.amountFromInput, "The filter panel should open when Filter is clicked").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** SOFT ASSERTIONS: the filter panel offers all of its controls. */
  async assertFilterControls() {
    await expect.soft(this.amountFromInput, "'Amount From' should be offered").toBeVisible();
    await expect.soft(this.amountToInput, "'Amount To' should be offered").toBeVisible();
    await expect.soft(this.statusSelect, "The Payment Status dropdown should be offered").toBeVisible();
    await expect.soft(this.paymentDateInput, "'Payment Date' should be offered").toBeVisible();
    await expect.soft(this.applyFiltersButton, "'Apply Filters' should be offered").toBeVisible();
  }

  /** The statuses the Payment Status dropdown actually offers. */
  async statusOptions() {
    return this.statusSelect
      .locator("option")
      .allInnerTexts()
      .then((v) => v.map((t) => t.trim()).filter(Boolean))
      .catch(() => []);
  }

  /** Sets the Payment Status. Returns false when the status is not offered. */
  async selectStatus(status) {
    const options = await this.statusOptions();
    const match = options.find((o) => o.toLowerCase() === String(status).toLowerCase());
    if (!match) return false;
    await this.statusSelect.selectOption({ label: match }).catch(() => {});
    return true;
  }

  /** Sets the amount range. */
  async setAmountRange(from, to) {
    if (from !== undefined) await this.amountFromInput.fill(String(from)).catch(() => {});
    if (to !== undefined) await this.amountToInput.fill(String(to)).catch(() => {});
  }

  /** Applies the filter and waits for the table to re-render. */
  async applyFilters() {
    await expect(this.applyFiltersButton, "'Apply Filters' should be clickable").toBeVisible({ timeout: TIMEOUTS.UI });
    await this.applyFiltersButton.click({ force: true });
    // A filter can legitimately return ZERO rows, so settle on a stable count rather than
    // waiting for rows to appear.
    let previous = -1;
    for (let i = 0; i < 10; i++) {
      await this.page.waitForTimeout(1000);
      const rows = await this.rowCount();
      if (rows === previous) return rows;
      previous = rows;
    }
    return previous;
  }

  // ---- Re-payment ----

  /** The row's RE-PAYMENT control (the circular two-arrow "repeat" icon). */
  repaymentButton(index = 0) {
    return this.rows.nth(index).locator('button:has(img[srcset*="repeat"])').first();
  }

  /** How many rows offer the re-payment action. */
  async repayableRowCount() {
    const n = await this.rowCount();
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (await this.repaymentButton(i).isVisible().catch(() => false)) count++;
    }
    return count;
  }

  /** Clicks a row's re-payment icon. Returns the row's text so the caller can compare. */
  async clickRepayment(index = 0) {
    const rowText = await this.rows
      .nth(index)
      .innerText()
      .then((t) => t.replace(/\s+/g, " ").trim())
      .catch(() => "");
    const button = this.repaymentButton(index);
    await expect(button, `Row ${index} should offer the re-payment action`).toBeVisible({ timeout: TIMEOUTS.LOAD });
    await button.click();
    await this.page.waitForTimeout(4000);
    return rowText;
  }

  /**
   * ASSERTION: re-payment opened the bill payment form carrying that payment's details.
   * Returns what it found, so a test can compare it against the history row.
   */
  async assertRepaymentFormPrefilled() {
    const amountInput = this.page.locator('input[name="amount"]').first();
    const fromAccount = this.page.locator('select[name="accountFrom"]').first();
    await expect(amountInput, "Re-payment should open the payment form with its Amount").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });

    const values = {
      amount: await amountInput.inputValue().catch(() => ""),
      fromAccount: await fromAccount.inputValue().catch(() => ""),
      reference: await this.page.locator('input[name^="fieldData."]').first().inputValue().catch(() => ""),
      reEnter: await this.page.locator('input[name^="fieldData2."]').first().inputValue().catch(() => ""),
    };
    expect(values.amount.trim(), "The re-payment form should carry the original amount").not.toBe("");
    return values;
  }
}

module.exports = { BillPaymentHistoryPage };
