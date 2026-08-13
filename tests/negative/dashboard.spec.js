const { test, expect } = require("../../utils/fixtures");
const { DashboardPage } = require("../../pages/DashboardPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Dashboard — NEGATIVE / VALIDATION (session & access guards).
 */
test.describe("Dashboard - Negative & Validation", () => {
  test("TC_DASH_N01 - Verify that Dashboard is not accessible without a valid session", async ({ page, loginPage }) => {
    const dashboard = new DashboardPage(page);

    await test.step("Open the app without logging in", async () => {
      await loginPage.open();
    });

    await test.step("Validate the login page is shown and the dashboard is NOT accessible", async () => {
      await loginPage.assertLoaded();
      await expect(dashboard.dashboardNav, "Dashboard nav must NOT be visible before authentication").toBeHidden();
    });
  });

  test("TC_DASH_N02 - Verify that Logout ends the session and returns to login", async ({ page, loggedInDashboard, loginPage }) => {
    await test.step("Confirm the dashboard is loaded", async () => {
      await loggedInDashboard.assertLoaded();
    });

    await test.step("Log out", async () => {
      await loggedInDashboard.logout();
    });

    await test.step("Validate we are back on the login page (session ended)", async () => {
      await loginPage.assertLoaded();
      await expect(loggedInDashboard.dashboardNav, "Dashboard nav must NOT be visible after logout").toBeHidden();
    });
  });


  test("TC_DASH_N03 - Verify that Recent Transactions never renders a blank panel", async ({ loggedInDashboard }) => {
    // Each tab must show transactions OR an explicit empty state - a section with neither is
    // a blank panel and a real UI defect.
    for (const tabName of ["Transfer", "Payment", "Mobile Cash"]) {
      const switched = await loggedInDashboard.switchRecentTransactionsTab(tabName);
      if (!switched) continue;
      const rendered = await loggedInDashboard.assertRecentTransactionsRendered(tabName);
      expect(
        rendered,
        `The "${tabName}" tab renders a blank panel - no transactions and no "no transactions" message`
      ).toBeTruthy();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
