const { expect } = require("@playwright/test");

/**
 * Dashboard Page.
 * Top navigation: Dashboard | My Accounts | Quick Actions | Manage Schedules |
 *                 Payees & Billers | Portfolio | Self Services.
 * Dashboard body sections (all visible without scrolling in the app):
 *   - "Portfolio"  -> account cards, e.g. "Savings Account ... Available LKR 670,116.04"
 *   - "Quick Actions" -> tiles: Send Money, Bill Payment, Slipless, Fixed Deposit,
 *                        Account, Web Card, Stop Card, Stop Cheque, Mobile Cash, Freeze Accounts
 *   - "Recent Vishwa Transactions", "Favorite Billers", "Favorite Payees"
 *
 * Locators below are confirmed against the live app's accessibility tree.
 * Navigation is by CLICKING; each landing page is validated by its own page object.
 */
class DashboardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // ---- Top navigation ----
    this.dashboardNav = page.getByRole("button", { name: "Dashboard", exact: true });
    this.myAccountsNav = page.getByRole("button", { name: "My Accounts", exact: true });
    this.quickActions = page.getByText("Quick Actions", { exact: true }).first();
    this.manageSchedulesNav = page.getByText("Manage Schedules", { exact: true }).first();
    this.payeesBillersNav = page.getByText("Payees & Billers", { exact: true }).first();

    // ---- Dashboard body (validated by "Dashboard page all validations") ----
    // Accounts live under the "Portfolio" section; a card shows a balance like "LKR 670,116.04".
    // ("Available" and the amount are separate DOM nodes, so match the currency+amount token.)
    this.accountsSectionHeading = page.getByRole("heading", { name: /portfolio/i }).first();
    this.accountBalance = page.getByText(/(lkr|usd)\s*[\d,]+\.\d{2}/i).first();
    // Quick Actions is a body section with clickable tiles.
    this.quickActionsHeading = page.getByRole("heading", { name: /quick actions/i }).first();
    this.recentTransactionsHeading = page.getByRole("heading", { name: /recent vishwa transactions/i }).first();

    // Logout lives in the user menu at the right of the nav bar. The menu is a Tailwind
    // "group-hover" dropdown: it opens on HOVER over the user avatar, never on click.
    // Logout itself is a <div> (not a button), so it has no button role to match.
    this.profileMenuTrigger = page.locator('[class*="userContainer"]').first();
    this.logoutButton = page.locator('[class*="logOut"]').first();
    // Logout then asks to confirm: "Are you sure you want to logout?" -> Back | Confirm & Logout.
    this.logoutConfirmPrompt = page.getByText(/are you sure you want to logout/i);
    this.confirmLogoutButton = page.getByRole("button", { name: /confirm & logout/i });
  }

  /** ASSERTION: the dashboard/top navigation is loaded after login. */
  async assertLoaded() {
    await expect(this.dashboardNav, "Dashboard navigation should be visible after login").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.quickActions, "Quick Actions should be visible on the dashboard").toBeVisible();
  }

  /**
   * ASSERTION: "Dashboard page all validations".
   * Checks the top-nav items and the main dashboard body sections (accounts +
   * balance, Quick Actions, Recent Transactions). Soft assertions so the report
   * lists every missing element at once.
   */
  async assertAllValidations() {
    await this.assertLoaded();

    // Top navigation items.
    await expect.soft(this.dashboardNav, "Top nav: 'Dashboard' should be visible").toBeVisible();
    await expect.soft(this.myAccountsNav, "Top nav: 'My Accounts' should be visible").toBeVisible();
    await expect.soft(this.quickActions, "Top nav: 'Quick Actions' should be visible").toBeVisible();
    await expect.soft(this.manageSchedulesNav, "Top nav: 'Manage Schedules' should be visible").toBeVisible();
    await expect.soft(this.payeesBillersNav, "Top nav: 'Payees & Billers' should be visible").toBeVisible();

    // Accounts (Portfolio) section + at least one account card balance.
    await expect.soft(this.accountsSectionHeading, "Accounts (Portfolio) section should be visible").toBeVisible();
    await expect
      .soft(this.accountBalance, "An account card with an available balance should be visible")
      .toBeVisible();

    // Other main dashboard body sections.
    await expect.soft(this.quickActionsHeading, "Quick Actions section should be visible").toBeVisible();
    await expect
      .soft(this.recentTransactionsHeading, "Recent Vishwa Transactions section should be visible")
      .toBeVisible();
  }

  /**
   * ASSERTION: the given Quick Action tiles are visible on the dashboard body.
   * (On this app the Quick Actions are always-visible tiles, not a dropdown.)
   */
  async assertQuickActionItems(items) {
    for (const name of items) {
      const item = this.page.getByText(name, { exact: true }).last();
      await expect.soft(item, `Quick Action "${name}" should be visible`).toBeVisible({ timeout: 30_000 });
    }
  }

  /**
   * Waits for any Toastify toast (e.g. the login-success toast) to clear, so it
   * cannot overlay the top nav and intercept clicks. Bounded and non-fatal.
   */
  async waitForToastsToClear(timeout = 12_000) {
    await this.page
      .waitForFunction(() => !document.querySelector(".Toastify__toast"), null, { timeout })
      .catch(() => {});
  }

  /**
   * The top nav is briefly disabled/inert while the dashboard finishes loading
   * (My Accounts / Manage Schedules / Portfolio render as [disabled] and the
   * navLinks container intercepts clicks). Wait for that to lift, plus any toast,
   * before driving a nav click. Bounded and non-fatal.
   */
  async waitForNavReady(timeout = 30_000) {
    await this.waitForToastsToClear();
    await expect(this.myAccountsNav, "Top nav should become interactive after the dashboard loads")
      .toBeEnabled({ timeout })
      .catch(() => {});
    await this.waitForToastsToClear(3_000);
  }

  /**
   * Opens a top-nav dropdown (SubMenu) by clicking its trigger, then clicks the
   * item link (a.subMenuItem) that routes to the feature page. The dropdown is
   * collapsed until the trigger is clicked; the dashboard body tiles with the same
   * labels are NOT the nav. Shared by Quick Actions and My Accounts menus.
   */
  async openNavDropdownItem(triggerLocator, itemName) {
    await this.waitForNavReady();
    await triggerLocator.click();
    const item = this.page.locator('a[class*="subMenuItem"]').filter({ hasText: itemName }).first();
    await expect(item, `"${itemName}" should be visible in the nav dropdown`).toBeVisible({ timeout: 30_000 });
    await item.click();
    // The dropdown closes itself shortly after navigation; move the pointer clear of
    // the panel and wait for it to close so it doesn't overlay the destination page.
    await this.page.mouse.move(0, 0).catch(() => {});
    await this.page
      .locator('[class*="subMenuContainer"]')
      .first()
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
  }

  /** Navigates via the top-nav "Quick Actions" dropdown. */
  async openQuickAction(itemName) {
    await this.openNavDropdownItem(this.quickActions, itemName);
  }

  async goToSendMoney() {
    await this.openQuickAction("Send Money");
  }

  /** My Accounts > Credit Cards (used by Own Card Settlement). */
  async goToCreditCards() {
    await this.openNavDropdownItem(this.myAccountsNav, "Credit Cards");
  }

  async goToBillPayment() {
    await this.openQuickAction("Bill Payment");
  }

  /** Payees & Billers > Saved Payees (the "Add New Payee" flow lives on this page). */
  async goToSavedPayees() {
    await this.openNavDropdownItem(this.payeesBillersNav, "Saved Payees");
  }

  /** Payees & Billers > Saved Billers (the "Add New Biller" flow lives on this page). */
  async goToSavedBillers() {
    await this.openNavDropdownItem(this.payeesBillersNav, "Saved Billers");
  }

  async goToStopCard() {
    await this.openQuickAction("Stop Card");
  }

  /** Top-nav "Manage Schedules" -> the Schedule Management page (/dashboard/manage-schedule). */
  async goToManageSchedules() {
    await this.waitForNavReady();
    await expect(this.manageSchedulesNav, "'Manage Schedules' nav should be visible").toBeVisible({ timeout: 60_000 });
    await this.manageSchedulesNav.click();
  }

  /** Clicks a top-nav item by its visible text. */
  async openTopNav(itemName) {
    await this.waitForNavReady();
    const item = this.page.getByText(itemName, { exact: true }).first();
    await expect(item, `Top-nav item "${itemName}" should be visible`).toBeVisible({ timeout: 60_000 });
    await item.click();
  }

  /**
   * Logs out via the user menu at the right of the nav bar.
   *
   * That menu is a CSS "group-hover" dropdown, so it only opens while the pointer is
   * over the user avatar - clicking the avatar does nothing. Hover it, then click the
   * Logout item (a <div>, so no button role) without letting the pointer leave the menu.
   * Logout is a two-step action: it raises a "Are you sure you want to logout?" prompt
   * that must be confirmed.
   */
  async logout() {
    await this.waitForNavReady();
    await expect(this.profileMenuTrigger, "The user menu (avatar) should be visible in the nav bar").toBeVisible({
      timeout: 30_000,
    });
    await this.profileMenuTrigger.hover();

    await expect(this.logoutButton, "Logout should appear in the user menu when the avatar is hovered").toBeVisible({
      timeout: 30_000,
    });
    await this.logoutButton.click();

    // ASSERTION: the logout confirmation prompt is shown, then confirm it.
    await expect(this.logoutConfirmPrompt, "A logout confirmation prompt should be shown").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.confirmLogoutButton, "'Confirm & Logout' should be available").toBeVisible();
    await this.confirmLogoutButton.click();
  }
}

module.exports = { DashboardPage };
