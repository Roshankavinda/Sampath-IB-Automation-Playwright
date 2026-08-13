const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Freeze Accounts (Quick Actions > "Freeze Accounts" -> /dashboard/self-debit-freeze).
 *
 * Confirmed against the live app:
 *   heading "Freeze your operative accounts" + the warning "By selecting this option, you can
 *   freeze your accounts, preventing any further debits after confirmation. You may choose
 *   'All' to freeze all accounts or individually select the accounts you wish to freeze."
 *   A Search box and a table: All (checkbox) | Account Number | Currency | Status |
 *   Account Type | Available Balance, each row with its own checkbox. Button: "Next".
 *
 * !! SAFETY !! Freezing an account BLOCKS ALL FURTHER DEBITS, which would break every
 * transaction test in the suite (and the real account). This page object therefore NEVER
 * submits the freeze - it only reads the page and, at most, ticks/unticks a row locally.
 */
class FreezeAccountsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.url = "/SVRClientWebV4/dashboard/self-debit-freeze";

    this.tile = page.getByRole("button", { name: /freeze.*accounts/i }).first();
    this.heading = page.getByRole("heading", { name: /freeze your operative accounts/i }).first();
    this.warningText = page.getByText(/preventing any further debits after confirmation/i).first();
    this.searchBox = page.getByPlaceholder(/search/i).first();

    this.table = page.locator("table").first();
    this.rows = page.locator("table tbody tr");
    this.selectAllCheckbox = page.getByRole("columnheader", { name: /all/i }).getByRole("checkbox").first();
    this.nextButton = page.getByRole("button", { name: /^next$/i }).first();
  }

  /** Opens the Freeze Accounts screen from the dashboard tile. */
  async open(dashboard) {
    if (dashboard && typeof dashboard.goToDashboard === "function") await dashboard.goToDashboard().catch(() => {});
    await expect(this.tile, "The 'Freeze Accounts' quick action should be available").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await this.tile.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);
    if (!(await this.heading.isVisible().catch(() => false))) {
      await this.page.goto(this.url, { waitUntil: "domcontentloaded" });
    }
    await this.assertLoaded();
  }

  /** ASSERTION: the Freeze Accounts screen is displayed with its warning. */
  async assertLoaded() {
    await expect(this.heading, "'Freeze your operative accounts' heading should be visible").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await expect(this.warningText, "The freeze warning should explain that debits will be blocked").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
  }

  /** ASSERTION: the account table lists freezable accounts with their details. */
  async assertAccountsListed() {
    await expect
      .poll(async () => this.rows.count().catch(() => 0), {
        timeout: TIMEOUTS.LOAD,
        message: "The freeze screen should list the operative accounts",
      })
      .toBeGreaterThan(0);

    const first = (await this.rows.first().innerText().catch(() => "")) || "";
    expect(first, "An account row should show its account number").toMatch(/\d{6,}/);
    expect(first, "An account row should show a currency balance").toMatch(/[\d,]+\.\d{2}/);
  }

  /** SOFT VALIDATIONS: the table headers and controls are present. */
  async assertTableColumns() {
    for (const header of ["Account Number", "Currency", "Status", "Account Type", "Available Balance"]) {
      await expect
        .soft(this.page.getByRole("columnheader", { name: new RegExp(header, "i") }).first(), `Column "${header}"`)
        .toBeVisible();
    }
    await expect.soft(this.searchBox, "A search box should be shown").toBeVisible();
    await expect.soft(this.nextButton, "A Next button should be shown").toBeVisible();
  }

  /** Ticks a single account's checkbox (LOCAL ONLY - never submitted). */
  async selectAccount(accountPartial) {
    const row = accountPartial
      ? this.rows.filter({ hasText: new RegExp(accountPartial.replace(/\s+/g, "\\s*")) }).first()
      : this.rows.first();
    await expect(row, `An account row matching "${accountPartial || "(first)"}" should be listed`).toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await row.getByRole("checkbox").first().check({ force: true }).catch(() => {});
    return row;
  }

  /** Unticks every selected account, leaving the screen as found. */
  async clearSelection() {
    const boxes = this.page.locator('table input[type="checkbox"]');
    const n = await boxes.count().catch(() => 0);
    for (let i = 0; i < n; i++) {
      if (await boxes.nth(i).isChecked().catch(() => false)) {
        await boxes.nth(i).uncheck({ force: true }).catch(() => {});
      }
    }
  }

  /** Filters the account table via the search box. */
  async search(text) {
    await this.searchBox.fill(text);
    await this.page.waitForTimeout(1500);
  }
}

module.exports = { FreezeAccountsPage };
