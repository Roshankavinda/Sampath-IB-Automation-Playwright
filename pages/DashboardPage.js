const { expect } = require("@playwright/test");

/**
 * Dashboard Page.
 * Top navigation: Dashboard | My Accounts | Quick Actions (dropdown) | Manage Schedules |
 *                 Payees & Billers | Portfolio | Self Services.
 * Quick Actions dropdown items: Send Money, Bill Payment, Slipless, Fixed Deposit,
 *                 Account, Web Card, Stop Card, Stop Cheque, Mobile Cash, Freeze Accounts.
 *
 * Navigation is done by CLICKING (no URL assertions). Each landing page is
 * validated by the page object it navigates to. This page also owns the
 * "Dashboard page all validations" checks (assertAllValidations).
 */
class DashboardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // ---- Top navigation ----
    this.dashboardNav = page.getByRole("button", { name: "Dashboard", exact: true });
    this.quickActions = page.getByText("Quick Actions", { exact: true }).first();
    this.myAccountsNav = page.getByRole("button", { name: "My Accounts", exact: true });
    this.manageSchedulesNav = page.getByText("Manage Schedules", { exact: true }).first();
    this.payeesBillersNav = page.getByText("Payees & Billers", { exact: true }).first();
    this.portfolioNav = page.getByText("Portfolio", { exact: true }).first();
    this.selfServicesNav = page.getByText("Self Services", { exact: true }).first();

    // ---- Dashboard body (validated by "Dashboard page all validations") ----
    // VERIFY the exact wording of these against the live app; patterns are tolerant.
    this.welcomeText = page.getByText(/welcome|good (morning|afternoon|evening)|hello/i).first();
    this.accountSummaryHeading = page
      .getByText(/my accounts|account summary|accounts overview/i)
      .first();
    // At least one account tile/card showing a balance (currency + amount).
    this.accountTile = page
      .locator("[class*='account'], [class*='card']")
      .filter({ hasText: /lkr|rs\.?|\d{1,3}(,\d{3})*(\.\d{2})?/i })
      .first();
    this.logoutButton = page.getByRole("button", { name: /log ?out|sign ?out/i }).first();
  }

  /** ASSERTION: the dashboard/top navigation is loaded after login. */
  async assertLoaded() {
    await expect(this.dashboardNav, "Dashboard navigation should be visible after login").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.quickActions, "Quick Actions menu should be visible on the dashboard").toBeVisible();
  }

  /**
   * ASSERTION: "Dashboard page all validations".
   * Checks the top-nav items, the account summary area, at least one account
   * tile, the Quick Actions menu and the logout control are all present.
   * Uses soft assertions so the report lists every missing element at once.
   */
  async assertAllValidations() {
    await this.assertLoaded();

    // Top navigation items.
    await expect.soft(this.dashboardNav, "Top nav: 'Dashboard' should be visible").toBeVisible();
    await expect.soft(this.myAccountsNav, "Top nav: 'My Accounts' should be visible").toBeVisible();
    await expect.soft(this.quickActions, "Top nav: 'Quick Actions' should be visible").toBeVisible();
    await expect.soft(this.manageSchedulesNav, "Top nav: 'Manage Schedules' should be visible").toBeVisible();
    await expect.soft(this.payeesBillersNav, "Top nav: 'Payees & Billers' should be visible").toBeVisible();

    // Dashboard body.
    await expect.soft(this.accountSummaryHeading, "Account summary / My Accounts section should be visible")
      .toBeVisible();
    await expect.soft(this.accountTile, "At least one account tile with a balance should be visible")
      .toBeVisible();
    await expect.soft(this.logoutButton, "Logout control should be visible on the dashboard").toBeVisible();
  }

  /** ASSERTION: the given Quick Actions items are all present in the dropdown. */
  async assertQuickActionItems(items) {
    await this.quickActions.click();
    for (const name of items) {
      const item = this.page.getByText(name, { exact: true }).last();
      await expect.soft(item, `Quick Action "${name}" should be listed in the menu`).toBeVisible({
        timeout: 30_000,
      });
    }
    // Close the dropdown again so it doesn't block later clicks.
    await this.page.keyboard.press("Escape").catch(() => {});
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

  async goToStopCard() {
    await this.openQuickAction("Stop Card");
  }

  /** Clicks a top-nav item by its visible text (outside the Quick Actions dropdown). */
  async openTopNav(itemName) {
    const item = this.page.getByText(itemName, { exact: true }).first();
    await expect(item, `Top-nav item "${itemName}" should be visible`).toBeVisible({ timeout: 60_000 });
    await item.click();
  }

  /** Logs out (used by the dashboard negative/session test). */
  async logout() {
    await expect(this.logoutButton, "Logout control should be visible").toBeVisible({ timeout: 30_000 });
    await this.logoutButton.click();
  }
}

module.exports = { DashboardPage };
