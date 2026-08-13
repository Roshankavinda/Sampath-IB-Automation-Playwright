const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");

/**
 * Portfolio — the TOP-NAV "Portfolio" feature (VIEW ONLY).
 *
 * Confirmed against the live app: the nav-bar "Portfolio" button navigates to
 * /dashboard/portfolio (it is a page, not a dropdown). The page renders:
 *   heading "Portfolio" (h2)
 *   paragraph "Monitor your account balances and track your financial portfolio"
 *   breadcrumb "Dashboard > Portfolio"
 *
 * !! LIVE FINDING !! Its portfolio DATA does not load in this environment: no table, no
 * balances and no chart ever appear, and the top-nav buttons stay DISABLED (the page never
 * finishes loading). The positive tests therefore assert the page/header, and the negative
 * suite carries the check that flags the blank/stuck-loading body.
 *
 * (The dashboard's own "Portfolio" account-card section is a different thing - it is covered
 * by dashboard.spec.js TC_DASH_H03.)
 */
class PortfolioPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.url = "/SVRClientWebV4/dashboard/portfolio";

    this.navButton = page.getByRole("button", { name: "Portfolio", exact: true }).first();
    this.heading = page.getByRole("heading", { name: /^portfolio$/i }).first();
    this.description = page.getByText(/monitor your account balances and track your financial portfolio/i).first();
    this.breadcrumb = page.getByText(/dashboard\s*>\s*portfolio/i).first();

    // Portfolio body (data): a table, balances and/or a chart.
    this.table = page.locator("table").first();
    this.rows = page.locator("table tbody tr");
    this.balance = page.getByText(/(lkr|usd)\s*[\d,]+\.\d{2}/i).locator("visible=true").first();
    this.chart = page.locator("canvas, svg[class*='chart'], [class*='chart']").first();
    this.emptyState = page.getByText(/no .*(data|accounts|records|found)/i).locator("visible=true").first();
    this.errorState = page
      .getByText(/error loading|failed to load|something went wrong|unable to load/i)
      .locator("visible=true")
      .first();
  }

  /** Opens Portfolio from the top-nav button (it navigates to /dashboard/portfolio). */
  async open() {
    await expect(this.navButton, "The top-nav 'Portfolio' button should be visible").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await this.navButton.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(3000);
    if (!/\/dashboard\/portfolio/.test(this.page.url())) {
      await this.page.goto(this.url, { waitUntil: "domcontentloaded" });
    }
    await this.assertLoaded();
  }

  /** ASSERTION: the Portfolio page is displayed with its header and breadcrumb. */
  async assertLoaded() {
    await expect(this.heading, "The Portfolio page heading should be visible").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await expect(this.description, "The Portfolio page description should be shown").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
  }

  /** ASSERTION: the page is reached at its own route (not left on the dashboard). */
  async assertOnPortfolioRoute() {
    expect(this.page.url(), "The Portfolio nav button should land on /dashboard/portfolio").toContain(
      "/dashboard/portfolio"
    );
  }

  /** SOFT ASSERTION: the breadcrumb reflects the Portfolio page. */
  async assertBreadcrumb() {
    await expect.soft(this.breadcrumb, "The breadcrumb should read 'Dashboard > Portfolio'").toBeVisible();
  }

  /**
   * Waits for the page to finish loading (the top nav is disabled while it loads) and
   * reports whether the portfolio BODY actually rendered any data.
   * @returns {{ loaded: boolean, rows: number, hasBalance: boolean, hasChart: boolean, empty: boolean }}
   */
  async readContentState() {
    // The nav re-enables once the page settles; give it a bounded wait.
    for (let i = 0; i < 12; i++) {
      const stillLoading = await this.page
        .getByRole("button", { name: "My Accounts", exact: true })
        .first()
        .isDisabled()
        .catch(() => true);
      if (!stillLoading) break;
      await this.page.waitForTimeout(2000);
    }
    await this.page.waitForTimeout(2000);

    const loaded = !(await this.page
      .getByRole("button", { name: "My Accounts", exact: true })
      .first()
      .isDisabled()
      .catch(() => true));
    const rows = await this.rows.count().catch(() => 0);
    const hasBalance = await this.balance.isVisible().catch(() => false);
    const hasChart = await this.chart.isVisible().catch(() => false);
    const empty = await this.emptyState.isVisible().catch(() => false);
    return { loaded, rows, hasBalance, hasChart, empty };
  }

  /** ASSERTION: the page shows no loading error. */
  async assertNoError() {
    await expect(this.errorState, "The Portfolio page must not display a loading error").toBeHidden();
  }
}

module.exports = { PortfolioPage };
