const { expect } = require("@playwright/test");
const { fillOtpBoxes } = require("../utils/helpers");

/**
 * Forgot Password page (reached from the login screen's "Forgot Password" link).
 * Flow: enter username (and identifier such as NIC) -> Submit -> OTP verification
 *       -> set/confirm a new password -> success.
 *
 * // VERIFY against the live app: the heading text and field name attributes below.
 * // The exact steps (which identifiers are asked, whether OTP is shown) can vary,
 * // so the page object keeps each step independent and tolerant.
 */
class ForgotPasswordPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/forgot (your )?password|reset (your )?password|password recovery/i).first();
    this.usernameInput = page
      .locator('input[name="username"], input[name="userName"], input[name="user"]')
      .first();
    this.nicInput = page.locator('input[name="nic"], input[name="nicNumber"], input[name="identifier"]').first();
    this.otpBoxes = page.locator("input.otp-box");
    this.newPasswordInput = page.locator('input[name="newPassword"], input[name="password"]').first();
    this.confirmPasswordInput = page
      .locator('input[name="confirmPassword"], input[name="reEnterPassword"], input[name="confirm"]')
      .first();
    this.submitButton = page.getByRole("button", { name: /^(submit|next|continue|confirm|reset)$/i }).first();
    this.errorText = page.getByText(/invalid|not found|does not exist|incorrect|no user/i).first();
  }

  /** ASSERTION: the Forgot Password page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "Forgot Password heading should be visible").toBeVisible({ timeout: 30_000 });
    await expect(this.usernameInput, "Forgot Password: username field should be visible").toBeVisible();
  }

  /** Enters the username (and NIC if the field is present) and submits. */
  async requestReset({ username, nic } = {}) {
    await this.usernameInput.click();
    await this.usernameInput.fill(username);
    // ASSERTION: username was entered.
    await expect(this.usernameInput, "Username should hold the entered value").toHaveValue(new RegExp(username));

    if (nic && (await this.nicInput.isVisible().catch(() => false))) {
      await this.nicInput.fill(nic);
    }

    await expect(this.submitButton, "Submit should be enabled once the username is entered").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }

  /** Completes the OTP step if the reset flow shows one (bypassed OTP in UAT). */
  async handleOtpIfPresent(otp) {
    const shown = await this.otpBoxes
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!shown) return;
    await fillOtpBoxes(this.page, otp);
    const next = this.page.getByRole("button", { name: /verify|submit|continue|confirm/i }).first();
    if (await next.isVisible().catch(() => false)) await next.click();
  }

  /** Sets and confirms a new password when the reset flow reaches that step. */
  async setNewPassword(newPassword) {
    await expect(this.newPasswordInput, "New password field should be visible").toBeVisible({ timeout: 20_000 });
    await this.newPasswordInput.fill(newPassword);
    if (await this.confirmPasswordInput.isVisible().catch(() => false)) {
      await this.confirmPasswordInput.fill(newPassword);
    }
    await expect(this.submitButton, "Submit should be enabled once passwords are entered").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }

  /** ASSERTION: the reset request was accepted (OTP step or success message appears). */
  async assertResetAccepted() {
    const progressed = this.page
      .getByText(/otp|verification code|new password|reset|success|sent/i)
      .first();
    await expect(progressed, "Reset request should progress (OTP / new-password / success step)").toBeVisible({
      timeout: 30_000,
    });
  }

  /** ASSERTION: an unknown/invalid username is rejected. */
  async assertRejected() {
    await expect(this.errorText, "An error should be shown for an unknown/invalid username").toBeVisible({
      timeout: 20_000,
    });
  }
}

module.exports = { ForgotPasswordPage };
