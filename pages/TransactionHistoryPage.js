const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Send Money > TRANSACTION HISTORY tab.
 *
 * Confirmed against the live app:
 *   Heading "Transaction History" / "All the vishwa transactions made via web portal and
 *   mobile application." with a "Filter" button and two sub-tabs: "Fund Transfer" and
 *   "Mobile Cash". A "Search Favourite Payees" panel sits on the right.
 *
 *   Fund Transfer columns (11): Transaction ID | Nickname | Date And Time | Amount | Status |
 *     Transfer Category | Transfer Type | From Account Number | To Account Number |
 *     Beneficiary Remark | Actions
 *   Mobile Cash columns (8):   Transaction ID | Nickname | Date And Time | Amount | Status |
 *     From Account Number | Recipient Phone | Actions
 *
 * The "Filter" button is DISABLED while the table loads - that is the app's own loading
 * signal and is used here instead of fixed sleeps.
 */
class TransactionHistoryPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    this.tab = page.getByRole("button", { name: /transaction history/i }).first();
    this.heading = page.getByText(/all the vishwa transactions made via web portal/i).first();
    this.filterButton = page.getByRole("button", { name: /^filter$/i }).first();

    // Sub-tabs.
    this.fundTransferTab = page.getByText("Fund Transfer", { exact: true }).locator("visible=true").first();
    this.mobileCashTab = page.getByText("Mobile Cash", { exact: true }).locator("visible=true").first();

    this.rows = page.locator("table tbody tr");
    this.emptyState = page.getByText(/no .*(transactions?|data|records|found)/i).locator("visible=true").first();
    this.errorState = page.getByText(/error loading|failed to load|something went wrong/i).locator("visible=true").first();

    // Favourite payees panel (right-hand side).
    this.favouritesSearch = page.getByPlaceholder(/search favourite payees/i).first();
    this.favouritesPanel = page.getByText(/favourite/i).locator("visible=true").first();
  }

  /** Columns expected per sub-tab. */
  static columns(tab) {
    return /mobile/i.test(tab)
      ? ["Transaction ID", "Nickname", "Date And Time", "Amount", "Status", "From Account Number", "Recipient Phone", "Actions"]
      : [
          "Transaction ID",
          "Nickname",
          "Date And Time",
          "Amount",
          "Status",
          "Transfer Category",
          "Transfer Type",
          "From Account Number",
          "To Account Number",
          "Beneficiary Remark",
          "Actions",
        ];
  }

  /** Opens Send Money > Transaction History. */
  async open(dashboard) {
    await dashboard.goToSendMoney();
    await this.page.waitForTimeout(2500);
    await this.tab.click({ force: true }).catch(() => {});
    await this.waitForListReady();
    await this.assertLoaded();
  }

  /** ASSERTION: the Transaction History view is displayed. */
  async assertLoaded() {
    await expect(this.heading, "The Transaction History heading should be shown").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
  }

  /** Waits for the table to finish loading (the Filter button is disabled while it loads). */
  async waitForListReady() {
    for (let i = 0; i < 25; i++) {
      if (!(await this.filterButton.isDisabled().catch(() => true))) break;
      await this.page.waitForTimeout(1000);
    }
    await this.page.waitForTimeout(1000);
  }

  /** Switches sub-tab ("Fund Transfer" | "Mobile Cash"). */
  async switchTab(name) {
    const tab = /mobile/i.test(name) ? this.mobileCashTab : this.fundTransferTab;
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click({ force: true });
    await this.waitForListReady();
    return true;
  }

  /** SOFT ASSERTIONS: the sub-tab's columns are displayed. */
  async assertColumns(tab) {
    for (const header of TransactionHistoryPage.columns(tab)) {
      await expect
        .soft(this.page.getByRole("columnheader", { name: new RegExp(header, "i") }).first(), `Column "${header}"`)
        .toBeVisible();
    }
  }

  /** How many transaction rows are listed. */
  async rowCount() {
    return this.rows.count().catch(() => 0);
  }

  /**
   * ASSERTION: the listing shows rows or an explicit empty state. Polls, because the table
   * re-renders asynchronously after a tab switch or filter.
   */
  async assertListRendered(label) {
    let rows = 0;
    let empty = false;
    for (let i = 0; i < 15; i++) {
      rows = await this.rowCount();
      empty = await this.emptyState.isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    expect(rows > 0 || empty, `"${label}" should list transactions or show an explicit empty state`).toBeTruthy();
    return rows;
  }

  /**
   * The Actions column sits at the far RIGHT of a horizontally scrollable table
   * (div.overflow-x-auto), so it must be scrolled into view before its icons can be used.
   */
  async scrollActionsIntoView() {
    await this.page
      .evaluate(() => {
        const table = document.querySelector("table");
        let el = table;
        while (el && el !== document.body) {
          if (el.scrollWidth > el.clientWidth + 20) {
            el.scrollLeft = el.scrollWidth;
            return;
          }
          el = el.parentElement;
        }
      })
      .catch(() => {});
    await this.page.waitForTimeout(1500);
  }

  /** The action controls on a transaction row (download / re-payment). */
  rowActions(index = 0) {
    return this.rows.nth(index).getByRole("button");
  }

  /**
   * The row's DOWNLOAD button - its icon is the app's "Downlaod.png" asset (the typo is the
   * app's own). Matched on the image source so it cannot be confused with the repeat icon.
   */
  downloadButton(index = 0) {
    return this.rows.nth(index).locator('button:has(img[srcset*="Downlaod"])').first();
  }

  /**
   * The row's RE-PAYMENT button - the circular two-arrow icon ("repeat.png"). It is only
   * rendered for repeatable transactions; other rows show an empty placeholder in its slot.
   */
  repaymentButton(index = 0) {
    return this.rows.nth(index).locator('button:has(img[srcset*="repeat"])').first();
  }

  /** Finds the first row index that offers the re-payment (repeat) action, or -1. */
  async firstRepayableRow() {
    const n = await this.rowCount();
    for (let i = 0; i < n; i++) {
      if (await this.repaymentButton(i).isVisible().catch(() => false)) return i;
    }
    return -1;
  }

  /** How many action controls a row exposes. */
  async rowActionCount(index = 0) {
    return this.rowActions(index).count().catch(() => 0);
  }

  /** ASSERTION: no loading error is shown. */
  async assertNoError() {
    await expect(this.errorState, "Transaction History must not show a loading error").toBeHidden();
  }
}

module.exports = { TransactionHistoryPage };
