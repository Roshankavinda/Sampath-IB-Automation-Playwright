const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Send Money base page - shared by Own Account and Other Accounts flows.
 * Heading: "Make Transactions" / "Select preferred transaction methods."
 * Method tabs: Send Money | Saved Payees | Transaction History
 * Type tabs:   Own Account | Other Accounts | Other Credit Cards | Mobile Cash
 */
class SendMoneyPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText("Make Transactions", { exact: true });
    this.subHeading = page.getByText("Select preferred transaction methods.", { exact: true });
    this.ownAccountTab = page.getByRole("button", { name: "Own Account", exact: true });
    this.otherAccountsTab = page.getByRole("button", { name: "Other Accounts", exact: true });
    this.otherCreditCardsTab = page.getByRole("button", { name: "Other Credit Cards", exact: true });
    this.mobileCashTab = page.getByRole("button", { name: "Mobile Cash", exact: true });
    // Method tabs (top of the Send Money screen).
    this.savedPayeesTab = page.getByRole("button", { name: "Saved Payees", exact: true });
    this.transactionHistoryTab = page.getByRole("button", { name: "Transaction History", exact: true });
    // "Send Money" is also a nav item and a dashboard tile, so match only the visible tab.
    this.sendMoneyTab = page.getByRole("button", { name: "Send Money", exact: true }).locator("visible=true").first();
  }

  /** ASSERTION: the Send Money page is displayed (by heading, not URL). */
  async assertLoaded() {
    await expect(this.heading, "'Make Transactions' heading should be visible on the Send Money page").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.subHeading, "Send Money sub-heading should be visible").toBeVisible();
  }

  /**
   * Opens the Own Account tab.
   *
   * The tab renders before React attaches its handler, so a single click is sometimes
   * swallowed and the form never appears. Retry until the form's From Account dropdown
   * actually shows up.
   */
  async selectOwnAccountTab() {
    await expect(this.ownAccountTab, "'Own Account' tab should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
    const fromAccount = this.page.locator('select[name="accountFrom"]');

    for (let attempt = 0; attempt < 4; attempt++) {
      await this.ownAccountTab.click().catch(() => {});
      const opened = await fromAccount
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (opened) return;
    }
    throw new Error("The 'Own Account' transfer form did not open after selecting the Own Account tab.");
  }

  async selectOtherAccountsTab() {
    await expect(this.otherAccountsTab, "'Other Accounts' tab should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await this.otherAccountsTab.click();
  }

  async selectOtherCreditCardsTab() {
    await expect(this.otherCreditCardsTab, "'Other Credit Cards' tab should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.otherCreditCardsTab.click();
  }

  async selectMobileCashTab() {
    await expect(this.mobileCashTab, "'Mobile Cash' tab should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await this.mobileCashTab.click();
  }

  async selectSavedPayeesTab() {
    await expect(this.savedPayeesTab, "'Saved Payees' tab should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await this.savedPayeesTab.click();
  }

  // ---- Tab helpers (used by the tab-switching tests) ----

  /** SOFT ASSERTIONS: every method and type tab is offered on the Send Money screen. */
  async assertTabsOffered() {
    for (const [tab, label] of [
      [this.ownAccountTab, "Own Account"],
      [this.otherAccountsTab, "Other Accounts"],
      [this.otherCreditCardsTab, "Other Credit Cards"],
      [this.mobileCashTab, "Mobile Cash"],
      [this.savedPayeesTab, "Saved Payees"],
      [this.transactionHistoryTab, "Transaction History"],
    ]) {
      await expect.soft(tab, `The "${label}" tab should be offered`).toBeVisible();
    }
  }

  /** True for the four transfer-type tabs (they only exist under the "Send Money" method tab). */
  isTypeTab(name) {
    return /own account|other accounts|other credit cards|mobile cash/i.test(name);
  }

  /**
   * The type tabs (Own Account | Other Accounts | Other Credit Cards | Mobile Cash) live
   * INSIDE the "Send Money" method tab - opening "Saved Payees" or "Transaction History"
   * replaces the whole panel, so they are gone until Send Money is selected again.
   */
  async ensureTypeTabsVisible() {
    if (await this.ownAccountTab.isVisible().catch(() => false)) return true;
    if (await this.sendMoneyTab.isVisible().catch(() => false)) {
      await this.sendMoneyTab.click({ force: true }).catch(() => {});
      await this.ownAccountTab.waitFor({ state: "visible", timeout: TIMEOUTS.ACTION }).catch(() => {});
    }
    return this.ownAccountTab.isVisible().catch(() => false);
  }

  /** The tab locator for a tab name. */
  tab(name) {
    if (/^send money$/i.test(name)) return this.sendMoneyTab;
    if (/own/i.test(name)) return this.ownAccountTab;
    if (/credit/i.test(name)) return this.otherCreditCardsTab;
    if (/mobile/i.test(name)) return this.mobileCashTab;
    if (/saved/i.test(name)) return this.savedPayeesTab;
    if (/history/i.test(name)) return this.transactionHistoryTab;
    return this.otherAccountsTab;
  }

  /**
   * The control that proves a tab's own screen is on display.
   *   Own Account        -> select[name="accountTo"]  (only this form has a To Account list)
   *   Other Accounts     -> input[name="toAccountNumber"]
   *   Other Credit Cards -> input[name="CAN"]
   *   Mobile Cash        -> input[name="mobileNo"]
   *   Saved Payees       -> the payee table
   *   Transaction History-> the history heading
   */
  tabMarker(name) {
    if (/own/i.test(name)) return this.page.locator('select[name="accountTo"]');
    if (/credit/i.test(name)) return this.page.locator('input[name="CAN"]');
    if (/mobile/i.test(name)) return this.page.locator('input[name="mobileNo"]');
    if (/saved/i.test(name)) return this.page.getByText("Saved Payees", { exact: true }).locator("visible=true").first();
    if (/history/i.test(name)) return this.page.getByText(/all the vishwa transactions/i).first();
    return this.page.locator('input[name="toAccountNumber"]');
  }

  /**
   * Opens a tab and waits for its own screen to render.
   *
   * The tabs render before React attaches their handlers, so a single click is sometimes
   * swallowed - retry until the tab's marker control appears. Returns false when the tab
   * never opens, so a caller can report it rather than time out on a missing locator.
   */
  async openTab(name, attempts = 4) {
    // A type tab is only present while the "Send Money" method tab is active.
    if (this.isTypeTab(name)) await this.ensureTypeTabsVisible();
    const tab = this.tab(name);
    await expect(tab, `The "${name}" tab should be visible`).toBeVisible({ timeout: TIMEOUTS.LOAD });
    const marker = this.tabMarker(name);
    for (let attempt = 0; attempt < attempts; attempt++) {
      await tab.click({ force: true }).catch(() => {});
      const opened = await marker
        .first()
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (opened) return true;
    }
    return false;
  }

  /** ASSERTION: the named tab's own screen is displayed. */
  async assertTabOpen(name) {
    await expect(this.tabMarker(name).first(), `The "${name}" screen should be displayed`).toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }
}

module.exports = { SendMoneyPage };
