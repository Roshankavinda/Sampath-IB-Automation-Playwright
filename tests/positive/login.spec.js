const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { DashboardPage } = require("../../pages/DashboardPage");
const { credentials } = require("../../test-data/accounts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Login (Username & Password) — POSITIVE.
 * Valid credentials -> (OTP bypassed in UAT) -> dashboard -> logout.
 *
 * The logout leg closes the session cleanly: the user menu (avatar) is hovered to reveal
 * "Logout", the "Confirm & Logout" prompt is confirmed, and the app must return to the
 * login screen.
 */
test.describe("Login - Positive", () => {
  test("TC_LOGIN_H01 - Verify that Valid username & password lands on the dashboard", async ({ page, loginPage }) => {
    const dashboard = new DashboardPage(page);

    await test.step("Open the login page and validate it is displayed", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
    });

    await test.step("Enter valid credentials and click Login", async () => {
      await loginPage.enterCredentials(credentials.username, credentials.password);
      await loginPage.clickLogin();
    });

    await test.step("Complete OTP if shown (bypassed OTP: 111111)", async () => {
      await loginPage.handleOtpIfPresent(credentials.otp);
    });

    await test.step("Validate the dashboard is displayed", async () => {
      await dashboard.assertLoaded();
    });
  });

  test("TC_LOGIN_H02 - Verify that the user can log out after logging in", async ({ page, loginPage }) => {
    const dashboard = new DashboardPage(page);

    await test.step("Log in with valid credentials", async () => {
      await loginPage.login(credentials.username, credentials.password, credentials.otp);
      await dashboard.assertLoaded();
    });

    await test.step("Log out via the user menu and confirm", async () => {
      await dashboard.logout();
    });

    await test.step("Validate the session ended and the login page is shown", async () => {
      await expect(loginPage.usernameInput, "The login page should be shown after logging out").toBeVisible({
        timeout: TIMEOUTS.SLOW_LOAD,
      });
      await expect(loginPage.passwordInput, "The password field should be shown after logging out").toBeVisible();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
