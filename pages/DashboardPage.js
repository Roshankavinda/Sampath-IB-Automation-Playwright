const { expect } = require("@playwright/test");

/**
 * Dashboard Page.
 * Top navigation: Dashboard | My Accounts | Quick Actions (dropdown) | Manage Schedules |
 *                 Payees & Billers | Portfolio | Self Services.
 * Quick Actions dropdown items: Send Money, Bill Payment, Slipless, Fixed Deposit,
 *                 Account, Web Card, Stop Card, Stop Cheque, Mobile Cash, Freeze Accounts.
 *
 * Navigation is done by CLICKING (no URL assertions). Each landing page is
 * validated by the page object it navigates to.
 */
class DashboardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.dashboardNav = page.getByRole("button", { name: "Dashboard", exact: true });
    this.quickActions = page.getByText("Quick Actions", { exact: true }).first();
    this.myAccountsNav = page.getByRole("button", { name: "My Accounts", exact: true });
  }

  /** ASSERTION: the dashboard/top navigation is loaded after login. */
  async assertLoaded() {
    await expect(this.dashboardNav, "Dashboard navigation should be visible after login").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.quickActions, "Quick Actions menu should be visible on the dashboard").toBeVisible();
  }

  /** Opens the Quick Actions dropdown and clicks the given item by its visible text. */
  async openQuickAction(itemName) {
    await this.quickActions.click();
    const item = this.page.getByText(itemName, { exact: true }).last();
    await expect(item, `Quick Action "${itemName}" should be visible in the menu`).toBeVisible({ timeout: 60_000 });
    await item.click();
  }

  async goToSendMoney() {
    await this.openQuickAction("Send Money");
  }

  async goToBillPayment() {
    await this.openQuickAction("Bill Payment");
  }
}

module.exports = { DashboardPage };
