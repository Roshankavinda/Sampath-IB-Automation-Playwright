const { test, expect } = require("../../utils/fixtures");
const { invalidCredentials } = require("../../test-data/accounts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Login (Username & Password) — NEGATIVE / VALIDATION.
 */
test.describe("Login - Negative & Validation", () => {
  test("TC_LOGIN_N01 - Wrong password shows a login failure message", async ({ loginPage }) => {
    const data = invalidCredentials.wrongPassword;

    await test.step("Open the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
    });

    await test.step("Enter a wrong password and click Login", async () => {
      await loginPage.enterCredentials(data.username, data.password);
      await loginPage.clickLogin();
    });

    await test.step("Validate the login failure message and that we stay on login", async () => {
      await loginPage.assertLoginFailed();
    });
  });

  test("TC_LOGIN_N02 - Unknown username is rejected", async ({ loginPage }) => {
    const data = invalidCredentials.unknownUser;

    await test.step("Open the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
    });

    await test.step("Enter an unknown username and click Login", async () => {
      await loginPage.enterCredentials(data.username, data.password);
      await loginPage.clickLogin();
    });

    await test.step("Validate the login failure message", async () => {
      await loginPage.assertLoginFailed();
    });
  });

  test("TC_LOGIN_N03 - Login button is disabled with empty credentials", async ({ loginPage }) => {
    await test.step("Open the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
    });

    await test.step("With username & password empty, Login must be disabled", async () => {
      await expect(loginPage.loginButton, "Login should be disabled until credentials are entered").toBeDisabled({
        timeout: 10_000,
      });
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
