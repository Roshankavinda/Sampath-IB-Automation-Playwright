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
}

module.exports = { SendMoneyPage };
