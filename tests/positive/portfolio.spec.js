const { test } = require("../../utils/fixtures");
const { PortfolioPage } = require("../../pages/PortfolioPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Portfolio (top-nav) — VIEW ONLY (POSITIVE).
 * The nav-bar "Portfolio" button navigates to /dashboard/portfolio, a page headed
 * "Portfolio" / "Monitor your account balances and track your financial portfolio".
 *
 * NOTE: this is the NAV-BAR Portfolio feature. The dashboard's own Portfolio account-card
 * section is covered separately by dashboard.spec.js (TC_DASH_H03).
 */
test.describe("Portfolio (Top Nav) - Positive", () => {
  test("TC_PORT_H01 - Verify that Portfolio opens from the navigation bar", async ({ page, loggedInDashboard }) => {
    const portfolio = new PortfolioPage(page);
    await test.step("Click the nav-bar Portfolio button", async () => {
      await portfolio.open();
    });
    await test.step("The Portfolio route is reached", async () => {
      await portfolio.assertOnPortfolioRoute();
    });
  });

  test("TC_PORT_H02 - Verify that the Portfolio page shows its header and breadcrumb", async ({
    page,
    loggedInDashboard,
  }) => {
    const portfolio = new PortfolioPage(page);
    await portfolio.open();
    await test.step("The heading, description and breadcrumb are shown", async () => {
      await portfolio.assertLoaded();
      await portfolio.assertBreadcrumb();
    });
  });

  test("TC_PORT_H03 - Verify that the Portfolio page loads without an error", async ({ page, loggedInDashboard }) => {
    const portfolio = new PortfolioPage(page);
    await portfolio.open();

    await test.step("No loading error is displayed", async () => {
      await portfolio.assertNoError();
    });

    await test.step("Report what the portfolio body rendered", async () => {
      const state = await portfolio.readContentState();
      // eslint-disable-next-line no-console
      console.log(
        `Portfolio body: finishedLoading=${state.loaded} rows=${state.rows} balance=${state.hasBalance} chart=${state.hasChart} emptyState=${state.empty}`
      );
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
