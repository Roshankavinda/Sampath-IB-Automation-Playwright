const { test, expect } = require("../../utils/fixtures");
const { PortfolioPage } = require("../../pages/PortfolioPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Portfolio (top-nav) — NEGATIVE / VALIDATION.
 *   N01 the page must not display a loading error
 *   N02 the page must not stay stuck loading (the top nav must re-enable)
 *   N03 the body must not be blank - it must show data or an explicit empty state
 *   N04 the page must not be reachable without a session
 *
 * !! N02/N03 currently FAIL against this environment: /dashboard/portfolio renders only its
 * header - no table, balances or chart - and the top nav stays disabled. That is a real
 * defect these tests exist to surface.
 */
test.describe("Portfolio (Top Nav) - Negative & Validation", () => {
  test("TC_PORT_N01 - Verify that the Portfolio page shows no loading error", async ({ page, loggedInDashboard }) => {
    const portfolio = new PortfolioPage(page);
    await portfolio.open();
    await portfolio.assertNoError();
  });

  test("TC_PORT_N02 - Verify that the Portfolio page does not stay stuck loading", async ({
    page,
    loggedInDashboard,
  }) => {
    const portfolio = new PortfolioPage(page);
    await portfolio.open();
    const state = await portfolio.readContentState();
    expect(
      state.loaded,
      "The Portfolio page should finish loading (the top-nav buttons must re-enable), not stay disabled forever"
    ).toBeTruthy();
  });

  test("TC_PORT_N03 - Verify that the Portfolio body is not blank", async ({ page, loggedInDashboard }) => {
    const portfolio = new PortfolioPage(page);
    await portfolio.open();
    const state = await portfolio.readContentState();
    const hasContent = state.rows > 0 || state.hasBalance || state.hasChart;
    expect(
      hasContent || state.empty,
      `The Portfolio page renders a blank body - no accounts/balances/chart and no empty-state message ` +
        `(rows=${state.rows}, balance=${state.hasBalance}, chart=${state.hasChart})`
    ).toBeTruthy();
  });

  test("TC_PORT_N04 - Verify that Portfolio is not reachable without a session", async ({ page }) => {
    await page.goto("/SVRClientWebV4/dashboard/portfolio", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3000);
    const portfolio = new PortfolioPage(page);
    const balanceShown = await portfolio.balance.isVisible().catch(() => false);
    expect(balanceShown, "Portfolio balances must not be visible without a valid session").toBeFalsy();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
