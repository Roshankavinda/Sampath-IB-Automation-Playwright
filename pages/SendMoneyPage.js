const { expect } = require("@playwright/test");

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
  }

  /** ASSERTION: the Send Money page is displayed (by heading, not URL). */
  async assertLoaded() {
    await expect(this.heading, "'Make Transactions' heading should be visible on the Send Money page").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.subHeading, "Send Money sub-heading should be visible").toBeVisible();
  }

  async selectOwnAccountTab() {
    await expect(this.ownAccountTab, "'Own Account' tab should be visible").toBeVisible({ timeout: 30_000 });
    await this.ownAccountTab.click();
  }

  async selectOtherAccountsTab() {
    await expect(this.otherAccountsTab, "'Other Accounts' tab should be visible").toBeVisible({ timeout: 30_000 });
    await this.otherAccountsTab.click();
  }
}

module.exports = { SendMoneyPage };
