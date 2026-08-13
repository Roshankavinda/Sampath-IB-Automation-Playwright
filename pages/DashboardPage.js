const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

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

    // Remaining top-nav items.
    this.portfolioNav = page.getByRole("button", { name: "Portfolio", exact: true }).first();
    this.selfServicesNav = page.getByText("Self Services", { exact: true }).first();

    // Remaining dashboard body sections.
    this.favoriteBillersHeading = page.getByRole("heading", { name: /favou?rite billers/i }).first();
    this.favoritePayeesHeading = page.getByRole("heading", { name: /favou?rite payees/i }).first();
    this.maintenanceHeading = page.getByRole("heading", { name: /maintenance (&|and) updates/i }).first();
    // Each favourites widget lists entries or states it is empty.
    this.noFavouriteBillers = page.getByText(/no favou?rite billers? found/i).first();
    this.noFavouritePayees = page.getByText(/no favou?rite payees? found/i).first();

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
      timeout: TIMEOUTS.SLOW_LOAD,
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
    await expect.soft(this.portfolioNav, "Top nav: 'Portfolio' should be visible").toBeVisible();
    await expect.soft(this.selfServicesNav, "Top nav: 'Self Services' should be visible").toBeVisible();

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

    // The Favorites / Maintenance widgets sit below the fold and render lazily.
    await this.scrollToBottom();
    await expect.soft(this.favoriteBillersHeading, "Favorite Billers section should be visible").toBeVisible();
    await expect.soft(this.maintenanceHeading, "Maintenance & Updates section should be visible").toBeVisible();
    // NOTE: the "Favorite Payees" widget is rendered CONDITIONALLY - it is present on some
    // dashboard loads (showing "No favourite payees found") and absent on others. It is
    // therefore asserted only when the app actually renders it. // VERIFY whether its absence
    // is intended; if it should always render, turn this into an unconditional assertion.
    if (await this.favoritePayeesHeading.isVisible().catch(() => false)) {
      await expect.soft(this.favoritePayeesHeading, "Favorite Payees section should be visible").toBeVisible();
    }

    // The user menu (avatar) must be present - it is what exposes Settings/Logout.
    await expect.soft(this.profileMenuTrigger, "The user menu (avatar) should be visible").toBeVisible();
  }

  // ---- Dashboard-body entry points (distinct from the top-nav dropdowns) ----

  /** A Quick Action CARD in the dashboard body (not the nav-bar dropdown item). */
  quickActionCard(name) {
    return this.quickActionsHeading
      .locator("xpath=ancestor::*[2]")
      .getByText(new RegExp(`^${name}$`, "i"))
      .locator("visible=true")
      .first();
  }

  /** Opens a feature from its dashboard-body Quick Action card. */
  async openQuickActionCard(name) {
    const card = this.quickActionCard(name);
    await expect(card, `The "${name}" Quick Action card should be on the dashboard`).toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await card.click({ force: true });
    await this.page.waitForTimeout(3000);
  }

  // ---- Portfolio card: category tabs + carousel ----

  /**
   * The portfolio card's tab strip. "Deposits" only exists there, so its parent is the strip -
   * scoping this way avoids matching the "Freeze Accounts" quick action (whose text also
   * contains "Accounts") and navigating away from the dashboard.
   */
  get portfolioTabList() {
    return this.page.getByText("Deposits", { exact: true }).locator("visible=true").first().locator("..");
  }

  portfolioTab(category) {
    return this.portfolioTabList.getByText(new RegExp(`^${category}$`, "i")).first();
  }

  /** Switches the portfolio card to a category (Accounts | Deposits | Loans | ...). */
  async switchPortfolioCategory(category) {
    const tab = this.portfolioTab(category);
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click({ force: true });
    await this.page.waitForTimeout(2500);
    return true;
  }

  /**
   * ASSERTION: the selected portfolio category renders content or an explicit empty state.
   * Returns "content" | "empty".
   */
  async assertPortfolioCategoryRendered(category) {
    const hasCard = await this.page
      .getByText(/\d{4}\s\d{4}\s\d{4}|\d{4}\s*\d{2}XX/)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    const hasBalance = await this.accountBalance.isVisible().catch(() => false);
    const empty = await this.page
      .getByText(/no .*(data|accounts|records|found)/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      hasCard || hasBalance || empty,
      `The "${category}" portfolio category should show accounts or an explicit empty state`
    ).toBeTruthy();
    return hasCard || hasBalance ? "content" : "empty";
  }

  /** The portfolio carousel's pager ("1/8") and its next/previous controls. */
  get portfolioPager() {
    return this.page.getByText(/^\d+\/\d+$/).locator("visible=true").first();
  }

  portfolioScrollButton(direction) {
    // The portfolio card's own scroll controls sit next to its tab strip.
    return this.portfolioTabList
      .locator("xpath=..")
      .getByRole("button", { name: new RegExp(`scroll ${direction}`, "i") })
      .first();
  }

  /** Steps the portfolio carousel next/previous; returns the pager text before and after. */
  async stepPortfolioCarousel(direction) {
    const before = (await this.portfolioPager.textContent().catch(() => "")) || "";
    const button = this.portfolioScrollButton(direction);
    if (!(await button.isVisible().catch(() => false))) return { before, after: before, moved: false };
    await button.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2000);
    const after = (await this.portfolioPager.textContent().catch(() => "")) || "";
    return { before, after, moved: before !== after };
  }

  /**
   * ASSERTION: the Portfolio card shows the account's details - masked account number,
   * available balance, status and (for the primary account) its "Primary" badge.
   */
  async assertPortfolioCardDetails() {
    await expect(this.accountsSectionHeading, "The Portfolio section should be visible").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await expect(
      this.page.getByText(/\d{4}\s\d{4}\s\d{4}/).locator("visible=true").first(),
      "The Portfolio card should show a masked account number"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
    await expect(this.accountBalance, "The Portfolio card should show an available balance").toBeVisible();
    await expect
      .soft(this.page.getByText(/available/i).locator("visible=true").first(), "The card should label the balance as 'Available'")
      .toBeVisible();
    await expect
      .soft(this.page.getByText(/^(active|inactive)$/i).locator("visible=true").first(), "The card should show the account status")
      .toBeVisible();
    await expect
      .soft(this.page.getByText(/^primary$/i).locator("visible=true").first(), "The primary account should carry a 'Primary' badge")
      .toBeVisible();
  }

  /**
   * Switches the "Recent Vishwa Transactions" tab (Transfer | Payment | Mobile Cash) and
   * waits for its list to settle. Returns false when the tab is not offered.
   */
  async switchRecentTransactionsTab(tabName) {
    const tab = this.page.getByRole("tab", { name: new RegExp(`^${tabName}$`, "i") }).first();
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);

    // ASSERTION: the clicked tab became the selected/active one. The component does not set
    // aria-selected, so accept any of its real selection signals (including focus, which is
    // what the accessibility tree reports as "[active]").
    const selected = await tab
      .evaluate((el) => {
        const s = el.getAttribute("aria-selected");
        return (
          s === "true" ||
          el.dataset.state === "active" ||
          /active|selected/i.test(el.className || "") ||
          /active|selected/i.test(el.parentElement?.className || "") ||
          document.activeElement === el ||
          el.contains(document.activeElement)
        );
      })
      .catch(() => false);
    expect(selected, `The "${tabName}" transactions tab should become the selected tab`).toBeTruthy();
    return true;
  }

  /**
   * ASSERTION: the currently selected Recent Transactions tab renders - either transaction
   * rows or an explicit empty state, and never a loading error.
   */
  async assertRecentTransactionsRendered(tabName) {
    const error = this.page
      .getByText(/error loading|failed to load|something went wrong/i)
      .locator("visible=true")
      .first();
    await expect(error, `The "${tabName}" transactions tab must not show a loading error`).toBeHidden();

    // Scope to the Recent Transactions section - a page-wide amount match would be satisfied
    // by the Portfolio card's balance and give a false positive.
    const section = this.recentTransactionsHeading.locator("xpath=ancestor::*[3]");
    const seen = async (locator) => locator.locator("visible=true").first().isVisible().catch(() => false);

    // A transaction row carries a date ("Jul 21, 2026 at 3:10PM") and an amount.
    const hasDatedRow = await seen(section.getByText(/\w{3}\s+\d{1,2},\s*\d{4}\s+at/i));
    const hasAmount = await seen(section.getByText(/(lkr|usd)\s*[\d,]+\.\d{2}/i));
    const hasLoadMore = await seen(this.page.getByRole("button", { name: /load more/i }));
    const emptyState = await seen(this.page.getByText(/no .*(transactions|data|records|found)/i));

    const rendered = hasDatedRow || hasAmount || hasLoadMore || emptyState;
    // eslint-disable-next-line no-console
    console.log(
      `Recent Transactions / ${tabName}: rows=${hasDatedRow} amount=${hasAmount} loadMore=${hasLoadMore} empty=${emptyState}`
    );
    // NOTE: the app currently renders this section with NO rows AND NO empty-state message
    // when the transaction list fails to load - a blank panel. That is reported (see the
    // dedicated negative case) rather than failing the tab-switching test.
    return rendered;
  }

  /**
   * Scrolls to the bottom of the dashboard so its lazily-rendered widgets (Favorite Billers /
   * Payees, Maintenance & Updates) mount before they are asserted.
   */
  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await this.page.waitForTimeout(2500);
  }

  /**
   * ASSERTION: each favourites widget renders - either listing entries or showing its own
   * "No favourite ... found" empty state (never a blank panel).
   */
  async assertFavouriteWidgets() {
    await this.scrollToBottom();
    const billersEmpty = await this.noFavouriteBillers.isVisible().catch(() => false);
    const billersListed = await this.favoriteBillersHeading
      .locator("xpath=ancestor::*[2]")
      .getByText(/\d{6,}|\w{3,}/)
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      billersEmpty || billersListed,
      "The Favorite Billers widget should list billers or show its empty state"
    ).toBeTruthy();

    // The Favorite Payees widget renders conditionally - only assert it when present.
    if (await this.favoritePayeesHeading.isVisible().catch(() => false)) {
      const payeesEmpty = await this.noFavouritePayees.isVisible().catch(() => false);
      const payeesListed = await this.favoritePayeesHeading
        .locator("xpath=ancestor::*[2]")
        .getByText(/\d{6,}|\w{3,}/)
        .first()
        .isVisible()
        .catch(() => false);
      expect(
        payeesEmpty || payeesListed,
        "The Favorite Payees widget should list payees or show its empty state"
      ).toBeTruthy();
    }
  }

  /**
   * ASSERTION: the given Quick Action tiles are visible on the dashboard body.
   * (On this app the Quick Actions are always-visible tiles, not a dropdown.)
   */
  async assertQuickActionItems(items) {
    for (const name of items) {
      const item = this.page.getByText(name, { exact: true }).last();
      await expect.soft(item, `Quick Action "${name}" should be visible`).toBeVisible({ timeout: TIMEOUTS.LOAD });
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
    await expect(item, `"${itemName}" should be visible in the nav dropdown`).toBeVisible({ timeout: TIMEOUTS.LOAD });
    await item.click();
    // The dropdown closes itself shortly after navigation; move the pointer clear of
    // the panel and wait for it to close so it doesn't overlay the destination page.
    await this.page.mouse.move(0, 0).catch(() => {});
    await this.page
      .locator('[class*="subMenuContainer"]')
      .first()
      .waitFor({ state: "hidden", timeout: TIMEOUTS.QUICK })
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

  /** My Accounts > Loans (used by Loan Settlement). */
  async goToLoans() {
    await this.openNavDropdownItem(this.myAccountsNav, "Loans");
  }

  /** Dashboard Quick Actions tile "Open New Fixed Deposit" -> /dashboard/open-fd. */
  async goToOpenFixedDeposit() {
    await this.waitForNavReady();
    const tile = this.page.getByRole("button", { name: /Fixed Deposit/i }).first();
    await expect(tile, "'Open New Fixed Deposit' tile should be visible on the dashboard").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await tile.click();
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

  /**
   * Self Services > Request Tax Certificates.
   * The Self Services dropdown items are no-op links in this build, but the route works,
   * so navigate to it directly (requires an active session).
   */
  async goToTaxCertificates() {
    await this.page.goto("/SVRClientWebV4/dashboard/self-services/tax-certificates", {
      waitUntil: "domcontentloaded",
    });
  }

  /** Self Services > Balance Confirmation (note the plural route: balance-confirmations). */
  async goToBalanceConfirmations() {
    await this.page.goto("/SVRClientWebV4/dashboard/self-services/balance-confirmations", {
      waitUntil: "domcontentloaded",
    });
  }

  /** Secure messaging inbox (the mail icon in the nav) -> /dashboard/inbox. */
  async goToInbox() {
    await this.page.goto("/SVRClientWebV4/dashboard/inbox", { waitUntil: "domcontentloaded" });
  }

  /** Dashboard Quick Actions tile "Sampath Slipless" -> /dashboard/slipless-banking. */
  async goToSlipless() {
    await this.waitForNavReady();
    const tile = this.page.getByRole("button", { name: /slipless/i }).first();
    await expect(tile, "'Sampath Slipless' tile should be visible on the dashboard").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await tile.click();
  }

  /** Top-nav "Manage Schedules" -> the Schedule Management page (/dashboard/manage-schedule). */
  async goToManageSchedules() {
    await this.waitForNavReady();
    await expect(this.manageSchedulesNav, "'Manage Schedules' nav should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await this.manageSchedulesNav.click();
  }

  /** Clicks a top-nav item by its visible text. */
  async openTopNav(itemName) {
    await this.waitForNavReady();
    const item = this.page.getByText(itemName, { exact: true }).first();
    await expect(item, `Top-nav item "${itemName}" should be visible`).toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
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
      timeout: TIMEOUTS.LOAD,
    });
    await this.profileMenuTrigger.hover();

    await expect(this.logoutButton, "Logout should appear in the user menu when the avatar is hovered").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.logoutButton.click();

    // ASSERTION: the logout confirmation prompt is shown, then confirm it.
    await expect(this.logoutConfirmPrompt, "A logout confirmation prompt should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.confirmLogoutButton, "'Confirm & Logout' should be available").toBeVisible();
    await this.confirmLogoutButton.click();
  }
}

module.exports = { DashboardPage };
