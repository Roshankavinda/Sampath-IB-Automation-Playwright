const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { invalidCredentials, credentials } = require("../../test-data/accounts");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Login (Username & Password) — NEGATIVE / VALIDATION.
 *   N01 wrong password -> login failure
 *   N02 unknown username -> rejected
 *   N03 empty credentials -> Login disabled
 *   N04 only username (no password) -> Login disabled
 *   N05 only password (no username) -> Login disabled
 *   N06 password field is masked (type=password)
 *   N07 the mask/unmask (show password) toggle reveals and re-masks the password
 *   N08 'Resend OTP' becomes clickable after its countdown
 *
 * !! LIVE FINDING !! N07 FAILS against this build: the show-password button exists but does
 * nothing - the input stays type=password and the icon stays 'lucide-eye-off' on every click.
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


  test("TC_LOGIN_N07 - Verify that the password mask/unmask toggle works", async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.assertLoaded();

    await loginPage.passwordInput.click();
    await loginPage.passwordInput.pressSequentially("Hoax@666", { delay: 20 });

    // Masked by default.
    await expect(loginPage.passwordInput, "The password should be masked by default").toHaveAttribute(
      "type",
      "password"
    );
    await expect(loginPage.passwordToggle, "A mask/unmask toggle should be shown").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await expect(loginPage.eyeOffIcon, "The toggle should start with the 'eye-off' (masked) icon").toBeVisible();

    // Click to REVEAL.
    await loginPage.passwordToggle.click();
    await expect(
      loginPage.passwordInput,
      "APP DEFECT: clicking the show-password button does not reveal the password - the input stays " +
        "type=password and the icon stays 'lucide-eye-off' no matter how many times it is clicked."
    ).toHaveAttribute("type", "text", { timeout: TIMEOUTS.UI });

    // Click again to MASK.
    await loginPage.passwordToggle.click();
    await expect(loginPage.passwordInput, "Clicking the toggle again should mask the password").toHaveAttribute(
      "type",
      "password",
      { timeout: TIMEOUTS.UI }
    );
  });

  test("TC_LOGIN_N08 - Verify that Resend OTP becomes clickable after the countdown", async ({
    page,
    loginPage,
  }) => {
    await loginPage.open();
    await loginPage.assertLoaded();
    await loginPage.enterCredentials(credentials.username, credentials.password);
    await loginPage.clickLogin();

    // The OTP challenge is intermittent (a known device may skip it).
    const otpShown = await loginPage.otpBoxes
      .first()
      .waitFor({ state: "visible", timeout: TIMEOUTS.LOAD })
      .then(() => true)
      .catch(() => false);
    test.skip(!otpShown, "No OTP challenge was raised for this login (known device) - nothing to resend.");

    await expect(loginPage.resendOtpButton, "A 'Resend OTP' control should be shown").toBeVisible({
      timeout: TIMEOUTS.UI,
    });

    // It must start DISABLED (the countdown guards against spamming the OTP service)...
    const initiallyDisabled = await loginPage.resendOtpButton.isDisabled().catch(() => false);

    // ...and become clickable once the countdown elapses.
    await expect(
      loginPage.resendOtpButton,
      "'Resend OTP' should become enabled after its countdown expires"
    ).toBeEnabled({ timeout: TIMEOUTS.MANUAL_OTP > 120000 ? 120000 : TIMEOUTS.MANUAL_OTP });

    // eslint-disable-next-line no-console
    console.log(`Resend OTP: initiallyDisabled=${initiallyDisabled} -> became enabled`);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
