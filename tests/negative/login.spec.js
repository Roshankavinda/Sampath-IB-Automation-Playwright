const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { invalidCredentials } = require("../../test-data/accounts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Login (Username & Password) — NEGATIVE / VALIDATION.
 *   N01 wrong password -> login failure
 *   N02 unknown username -> rejected
 *   N03 empty credentials -> Login disabled
 *   N04 only username (no password) -> Login disabled
 *   N05 only password (no username) -> Login disabled
 *   N06 password field is masked (type=password)
 *
 * NOTE: only N01/N02 actually submit. To avoid locking the account, no further wrong-login
 * submissions are added - the extra cases assert client-side state without submitting.
 */
test.describe("Login - Negative & Validation", () => {
  test("TC_LOGIN_N01 - Verify that Wrong password shows a login failure message", async ({ loginPage }) => {
    const data = invalidCredentials.wrongPassword;
    await loginPage.open();
    await loginPage.assertLoaded();
    await loginPage.enterCredentials(data.username, data.password);
    await loginPage.clickLogin();
    await loginPage.assertLoginFailed();
  });

  test("TC_LOGIN_N02 - Verify that Unknown username is rejected", async ({ loginPage }) => {
    const data = invalidCredentials.unknownUser;
    await loginPage.open();
    await loginPage.assertLoaded();
    await loginPage.enterCredentials(data.username, data.password);
    await loginPage.clickLogin();
    await loginPage.assertLoginFailed();
  });

  test("TC_LOGIN_N03 - Verify that Login button is disabled with empty credentials", async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.assertLoaded();
    await expect(loginPage.loginButton, "Login should be disabled until credentials are entered").toBeDisabled({
      timeout: TIMEOUTS.QUICK,
    });
  });

  test("TC_LOGIN_N04 - Verify that Login is disabled with only the username filled", async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.assertLoaded();
    await loginPage.usernameInput.click();
    await loginPage.usernameInput.pressSequentially("gsuser4", { delay: 20 });
    await expect(loginPage.loginButton, "Login should stay disabled without a password").toBeDisabled({
      timeout: TIMEOUTS.QUICK,
    });
  });

  test("TC_LOGIN_N05 - Verify that Login is disabled with only the password filled", async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.assertLoaded();
    await loginPage.passwordInput.click();
    await loginPage.passwordInput.pressSequentially("Hoax@666", { delay: 20 });
    await expect(loginPage.loginButton, "Login should stay disabled without a username").toBeDisabled({
      timeout: TIMEOUTS.QUICK,
    });
  });

  test("TC_LOGIN_N06 - Verify that Password field masks its input", async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.assertLoaded();
    await expect(loginPage.passwordInput, "The password field should be of type=password (masked)").toHaveAttribute(
      "type",
      "password"
    );
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
