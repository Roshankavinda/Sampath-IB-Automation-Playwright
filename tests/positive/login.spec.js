const { test } = require("../../utils/fixtures");
const { DashboardPage } = require("../../pages/DashboardPage");
const { credentials } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Login (Username & Password) — POSITIVE.
 * Valid credentials -> (OTP bypassed in UAT) -> dashboard.
 */
test.describe("Login - Positive", () => {
  test("TC_LOGIN_H01 - Valid username & password lands on the dashboard", async ({ page, loginPage }) => {
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

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
