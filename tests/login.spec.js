const { test, expect } = require("../utils/fixtures");
const { DashboardPage } = require("../pages/DashboardPage");
const { credentials, invalidCredentials } = require("../test-data/testData");
const { getToastText } = require("../utils/helpers");

test.describe("Login", () => {
  test("TC_LOGIN_01 - Valid login lands on the dashboard", async ({ page, loginPage }) => {
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

  test("TC_LOGIN_02 - Invalid login shows a failure message", async ({ loginPage }) => {
    await test.step("Open the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
    });

    await test.step("Enter invalid credentials and click Login", async () => {
      await loginPage.enterCredentials(invalidCredentials.username, invalidCredentials.password);
      await loginPage.clickLogin();
    });

    await test.step("Validate the login failure message is displayed", async () => {
      await loginPage.assertLoginFailed();
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const toast = await getToastText(page, 1_000);
      if (toast) await testInfo.attach("last-toast-message", { body: toast, contentType: "text/plain" });
    }
  });
});
