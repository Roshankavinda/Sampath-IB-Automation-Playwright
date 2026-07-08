const { expect } = require("@playwright/test");
const { fillOtpBoxes } = require("../utils/helpers");

/**
 * Login Page (LoginComponent.tsx / LoginOtpScreen.tsx)
 * Fields: input[name="username"], input[name="cred"], button "Login".
 * OTP screen: 6 x input.otp-box.
 *
 * Page is validated by asserting the login heading and fields (no URL checks).
 */
class LoginPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText("Sampath Vishwa", { exact: true }).first();
    this.subHeading = page.getByText(/enter vishwa username & password/i);
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="cred"]');
    this.loginButton = page.getByRole("button", { name: "Login", exact: true });
    this.errorToast = page.getByText(/login failed/i);
    this.otpBoxes = page.locator("input.otp-box");
  }

  /** Opens the only URL-based navigation in the whole suite: the login page. */
  async open() {
    await this.page.goto("", { waitUntil: "domcontentloaded" });
  }

  /** ASSERTION: the login page is displayed. */
  async assertLoaded() {
    await expect(this.usernameInput, "Username field should be visible on the login page").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.passwordInput, "Password field should be visible on the login page").toBeVisible();
    await expect(this.loginButton, "Login button should be visible").toBeVisible();
  }

  async enterCredentials(username, password) {
    // App blocks paste on these fields - type character by character.
    await this.usernameInput.click();
    await this.usernameInput.pressSequentially(username, { delay: 30 });
    await this.passwordInput.click();
    await this.passwordInput.pressSequentially(password, { delay: 30 });
  }

  async clickLogin() {
    await expect(this.loginButton, "Login button should be enabled once credentials are entered").toBeEnabled();
    await this.loginButton.click();
  }

  /** Handles the login OTP screen only if it appears (bypassed in UAT). */
  async handleOtpIfPresent(otp) {
    const otpShown = await this.otpBoxes
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!otpShown) return;

    await fillOtpBoxes(this.page, otp);
    const otpSubmit = this.page
      .getByRole("button", { name: /verify|login|submit|continue|confirm/i })
      .first();
    if (await otpSubmit.isVisible().catch(() => false)) {
      await otpSubmit.click();
    }
  }

  /** Full valid-login flow (used by every end-to-end test). */
  async login(username, password, otp) {
    await this.open();
    await this.assertLoaded();
    await this.enterCredentials(username, password);
    await this.clickLogin();
    await this.handleOtpIfPresent(otp);
  }

  /** ASSERTION: invalid login shows the failure toast and stays on login. */
  async assertLoginFailed() {
    await expect(this.errorToast, "A 'Login Failed' message should be displayed for invalid credentials").toBeVisible({
      timeout: 20_000,
    });
    await expect(this.usernameInput, "User should remain on the login page").toBeVisible();
  }
}

module.exports = { LoginPage };
