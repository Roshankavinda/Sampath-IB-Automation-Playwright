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
    // The app's real message is a toast:
    // "LOGIN FAILED! PLEASE RECHECK THE USERNAME AND PASSWORD AND TRY AGAIN."
    // (a wrong password also appends "REMAINING LOGIN ATTEMPTS: n").
    this.errorToast = page.getByText(/login failed|recheck the username|remaining login attempts/i).first();
    this.otpBoxes = page.locator("input.otp-box");
    // The login screen shows a non-clickable "Forgot Password?" label next to a link
    // labelled "Reset". Target the link by its href so we never click the plain text.
    this.forgotPasswordLink = page.locator('a[href*="forgot-password"]').first();
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

  /**
   * Handles the login OTP screen only if it appears.
   *
   * Login OTP is ALWAYS bypassed automatically with the UAT code (111111) - it does NOT
   * honour IB_MANUAL_OTP. Only the transaction OTP (ConfirmationPopup) is entered by hand.
   *
   * The challenge is intermittent (a fresh browser context reads as a new device) and the
   * OTP screen can be slow to render, so it gets a generous wait; if it never appears,
   * login went straight to the dashboard.
   */
  async handleOtpIfPresent(otp) {
    const otpShown = await this.otpBoxes
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (!otpShown) return; // no OTP challenge this time - straight to the dashboard

    // Fill the 6-digit bypass code and confirm.
    await fillOtpBoxes(this.page, otp);
    const confirm = this.page.getByRole("button", { name: /^confirm$/i }).last();
    await expect(confirm, "Login OTP: Confirm should enable once the 6-digit bypass code is entered").toBeEnabled({
      timeout: 10_000,
    });
    await confirm.click();

    // Let the OTP screen clear as login proceeds (assertLoaded confirms the dashboard).
    await this.otpBoxes.first().waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }

  /** Full valid-login flow (used by every end-to-end test). */
  async login(username, password, otp) {
    await this.open();
    await this.assertLoaded();
    await this.enterCredentials(username, password);
    await this.clickLogin();
    await this.handleOtpIfPresent(otp);
  }

  /** Opens the Forgot Password ("Reset") flow from the login screen. */
  async goToForgotPassword() {
    await expect(this.forgotPasswordLink, "'Reset' (Forgot Password) link should be visible on the login page").toBeVisible(
      { timeout: 30_000 }
    );
    await this.forgotPasswordLink.click();
  }

  /**
   * ASSERTION: invalid login shows the failure toast and stays on login.
   *
   * The toast is transient (it auto-closes after a few seconds) and this environment can
   * be slow to answer the login request, so it gets a generous window to appear.
   */
  async assertLoginFailed() {
    await expect(this.errorToast, "A 'LOGIN FAILED' message should be displayed for invalid credentials").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.usernameInput, "User should remain on the login page").toBeVisible();
  }
}

module.exports = { LoginPage };
