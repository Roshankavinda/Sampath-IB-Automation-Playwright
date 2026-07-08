const base = require("@playwright/test");
const { LoginPage } = require("../pages/LoginPage");
const { DashboardPage } = require("../pages/DashboardPage");
const { credentials } = require("../test-data/testData");

/**
 * Custom fixtures.
 *  - loginPage / dashboardPage: page objects ready to use.
 *  - loggedInDashboard: performs a valid login and returns the asserted
 *    DashboardPage, so flow tests can start straight from the dashboard.
 */
const test = base.test.extend({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  loggedInDashboard: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);
    await loginPage.login(credentials.username, credentials.password, credentials.otp);
    await dashboard.assertLoaded();
    await use(dashboard);
  },
});

const expect = base.expect;
module.exports = { test, expect };
