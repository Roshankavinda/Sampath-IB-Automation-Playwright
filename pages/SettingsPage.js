const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { fillOtpBoxes } = require("../utils/helpers");

/**
 * Vishwa Account Settings (profile menu > Settings).
 *
 * Confirmed against the live app:
 *   - The avatar/user menu opens on HOVER and lists "Settings" and "Logout". The Settings
 *     item is a <div> inside an <a> with NO href - clicking it does not navigate, so the
 *     page is opened directly at /dashboard/settings (the only route that returns 200;
 *     /setting, /profile, /user-settings ... all 404).
 *   - Heading: "Vishwa Account Settings / Customize your Sampath Vishwa account."
 *   - Two tabs: "My Profile" | "Security".
 *   - My Profile > "Change language": radios English (default) | Sinhala | Tamil.
 *   - My Profile > "Select Primary Account": accounts with a "Set as Primary" button.
 *
 * // VERIFY: the Security tab's controls (Change Password, OTP verification mode, Terms &
 * // Conditions) could NOT be captured - the login kept flaking during exploration - so those
 * // locators are best-effort.
 *
 * SAFETY: settings changes affect the whole suite (a language switch would break every
 * English selector; a password change would break login), so the apply steps are opt-in and
 * the language is always restored to English.
 */
class SettingsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.url = "/SVRClientWebV4/dashboard/settings";

    // Profile (avatar) menu - opens on hover.
    this.profileMenuTrigger = page.locator('[class*="userContainer"]').first();
    this.settingsMenuItem = this.profileMenuTrigger.getByText(/^settings$/i).first();

    // Settings screen.
    this.heading = page.getByText(/vishwa account settings/i).first();
    this.subHeading = page.getByText(/customize your sampath vishwa account/i).first();
    this.myProfileTab = page.getByText(/^my profile$/i).locator("visible=true").first();
    this.securityTab = page.getByText(/^security$/i).locator("visible=true").first();

    // OTP gate (shown when the settings area or a change is confirmed).
    this.otpBoxes = page.locator("input.otp-box");
    this.confirmButton = page.getByRole("button", { name: /^(confirm|submit|verify|proceed)$/i }).last();

    // ---- My Profile: language ----
    this.languageSection = page.getByText(/change language/i).first();
    this.englishRadio = page.getByRole("radio", { name: /english/i });
    this.sinhalaRadio = page.getByRole("radio", { name: /sinhala/i });
    this.tamilRadio = page.getByRole("radio", { name: /tamil/i });

    // ---- My Profile: primary account ----
    this.primaryAccountSection = page.getByText(/select primary account/i).first();
    this.setAsPrimaryButtons = page.getByRole("button", { name: /set as primary/i });

    // ---- Security tab ---- // VERIFY (not observable during exploration)
    this.changePasswordSection = page.getByText(/change password/i).first();
    this.currentPasswordInput = page.getByRole("textbox", { name: /current password|old password/i }).first();
    this.newPasswordInput = page.getByRole("textbox", { name: /new password/i }).first();
    this.confirmPasswordInput = page.getByRole("textbox", { name: /confirm.*password|re-?enter.*password/i }).first();
    this.changePasswordSubmit = page.getByRole("button", { name: /change password|update password|^submit$/i }).first();

    this.otpModeSection = page.getByText(/otp verification|verification mode|otp mode/i).first();
    this.otpModeRadios = page.getByRole("radio");

    this.termsLink = page.getByRole("link", { name: /terms|conditions/i }).first();
    this.termsButton = page.getByRole("button", { name: /terms|conditions/i }).first();
  }

  /** Opens the profile (avatar) menu and asserts it offers Settings. */
  async openProfileMenu() {
    await expect(this.profileMenuTrigger, "The user menu (avatar) should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.profileMenuTrigger.hover();
    await expect(this.settingsMenuItem, "'Settings' should appear in the hovered user menu").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
  }

  /**
   * Opens Settings. The menu item is a no-op link (no href), so after showing it in the menu
   * we navigate straight to the confirmed /dashboard/settings route.
   */
  async open() {
    await this.openProfileMenu();
    await this.settingsMenuItem.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(1500);
    if (!(await this.heading.isVisible().catch(() => false))) {
      await this.page.goto(this.url, { waitUntil: "domcontentloaded" });
    }
    await this.assertLoaded();
  }

  /** ASSERTION: the Settings screen is displayed with both tabs. */
  async assertLoaded() {
    await expect(this.heading, "'Vishwa Account Settings' heading should be visible").toBeVisible({
      timeout: TIMEOUTS.SLOW_LOAD,
    });
    await expect(this.myProfileTab, "The 'My Profile' tab should be shown").toBeVisible({ timeout: TIMEOUTS.UI });
    await expect(this.securityTab, "The 'Security' tab should be shown").toBeVisible();
  }

  /**
   * Handles the settings OTP if one is requested.
   *
   * MANUAL BY DEFAULT (a real OTP is sent to the phone) - matches the rest of the suite.
   * Returns true if an OTP was handled, false if none was requested.
   */
  async handleOtpIfPresent(otp) {
    const shown = await this.otpBoxes
      .first()
      .waitFor({ state: "visible", timeout: TIMEOUTS.QUICK })
      .then(() => true)
      .catch(() => false);
    if (!shown) return false;

    if (process.env.IB_MANUAL_OTP !== "false") {
      const timeout = TIMEOUTS.MANUAL_OTP;
      // eslint-disable-next-line no-console
      console.log(
        `\n>>> MANUAL SETTINGS OTP: enter the OTP sent to your phone and confirm in the browser ` +
          `(waiting up to ${Math.round(timeout / 1000)}s)...\n`
      );
      const done = await this.otpBoxes
        .first()
        .waitFor({ state: "hidden", timeout })
        .then(() => true)
        .catch(() => false);
      if (!done) {
        throw new Error(
          `Timed out waiting for the Settings OTP to be entered manually. Run headed, and raise ` +
            "IB_MANUAL_OTP_TIMEOUT if you need longer."
        );
      }
      return true;
    }

    await fillOtpBoxes(this.page, otp);
    if (await this.confirmButton.isVisible().catch(() => false)) await this.confirmButton.click();
    await this.otpBoxes.first().waitFor({ state: "hidden", timeout: TIMEOUTS.UI }).catch(() => {});
    return true;
  }

  /** Opens the Security tab. */
  async openSecurityTab() {
    await this.securityTab.click({ force: true });
    await this.page.waitForTimeout(2500);
  }

  /** Opens the My Profile tab. */
  async openMyProfileTab() {
    await this.myProfileTab.click({ force: true });
    await this.page.waitForTimeout(2000);
  }

  // ---- Language ----

  /** ASSERTION: all three language options are offered. */
  async assertLanguageOptions() {
    await expect(this.languageSection, "The 'Change language' section should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.englishRadio, "English should be offered").toBeVisible();
    await expect(this.sinhalaRadio, "Sinhala should be offered").toBeVisible();
    await expect(this.tamilRadio, "Tamil should be offered").toBeVisible();
  }

  /** The language radio for a given name. */
  languageRadio(language) {
    if (/sinhala/i.test(language)) return this.sinhalaRadio;
    if (/tamil/i.test(language)) return this.tamilRadio;
    return this.englishRadio;
  }

  /** Which language is currently selected. */
  async currentLanguage() {
    for (const [name, radio] of [
      ["English", this.englishRadio],
      ["Sinhala", this.sinhalaRadio],
      ["Tamil", this.tamilRadio],
    ]) {
      if (await radio.isChecked().catch(() => false)) return name;
    }
    return "(none)";
  }

  /**
   * Selects a language.
   *
   * SAFETY: the suite's selectors are English, so callers MUST restore English afterwards
   * (see restoreEnglish) - the positive spec does this in a finally block.
   */
  async selectLanguage(language) {
    const radio = this.languageRadio(language);
    await radio.check({ force: true });
    await expect(radio, `"${language}" should be selected`).toBeChecked({ timeout: TIMEOUTS.UI });
  }

  /** Restores English so the rest of the suite keeps working. */
  async restoreEnglish() {
    await this.englishRadio.check({ force: true }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  // ---- Primary account ----

  /** ASSERTION: the primary-account section offers at least one "Set as Primary" action. */
  async assertPrimaryAccountSection() {
    await expect(this.primaryAccountSection, "The 'Select Primary Account' section should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect
      .poll(async () => this.setAsPrimaryButtons.count().catch(() => 0), {
        timeout: TIMEOUTS.LOAD,
        message: "At least one account should offer a 'Set as Primary' action",
      })
      .toBeGreaterThan(0);
  }

  /** Clicks "Set as Primary" for the account whose text matches `accountPartial`. */
  async setPrimaryAccount(accountPartial) {
    const button = accountPartial
      ? this.page
          .locator("div")
          .filter({ hasText: new RegExp(accountPartial.replace(/\s+/g, "\\s*")) })
          .getByRole("button", { name: /set as primary/i })
          .last()
      : this.setAsPrimaryButtons.first();
    await expect(button, `A 'Set as Primary' action should exist for "${accountPartial || "the first account"}"`)
      .toBeVisible({ timeout: TIMEOUTS.UI });
    await button.click();
  }

  // ---- Security: change password ---- // VERIFY

  /** ASSERTION: the Change Password form is shown on the Security tab. */
  async assertChangePasswordForm() {
    await expect(this.changePasswordSection, "A 'Change Password' section should be shown on Security").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** Fills the change-password form (does NOT submit unless the caller opts in). */
  async fillChangePassword({ currentPassword, newPassword, confirmPassword }) {
    if (currentPassword) await this.currentPasswordInput.fill(currentPassword).catch(() => {});
    if (newPassword) await this.newPasswordInput.fill(newPassword).catch(() => {});
    if (confirmPassword != null) await this.confirmPasswordInput.fill(confirmPassword).catch(() => {});
  }

  // ---- Security: OTP verification mode ---- // VERIFY

  /** ASSERTION: an OTP verification-mode setting is offered. */
  async assertOtpModeSection() {
    await expect(this.otpModeSection, "An OTP verification-mode section should be shown on Security").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  // ---- Security: terms & conditions ----

  /** Opens the Terms & Conditions view and asserts content is displayed. */
  async viewTermsAndConditions() {
    const control = (await this.termsLink.isVisible().catch(() => false)) ? this.termsLink : this.termsButton;
    await expect(control, "A Terms & Conditions link/button should be shown on Security").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await control.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);
    await expect(
      this.page.getByText(/terms|conditions|agreement/i).locator("visible=true").first(),
      "The Terms & Conditions content should be displayed"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  }
}

module.exports = { SettingsPage };
