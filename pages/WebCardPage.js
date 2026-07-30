const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { fillOtpBoxes } = require("../utils/helpers");

/**
 * Web Card opening — dashboard Quick Actions tile "Apply Web Card" -> a modal wizard.
 * All selectors confirmed against the live app (profile: v11user8, whose account is
 * eligible; the default gsuser4 account's tile stays disabled).
 *
 * The tile is DISABLED during dashboard load and enables a few seconds later.
 *
 * Modal (div.fixed.inset-0.z-50) steps:
 *   1. "Web Card Apply" - resident question: radios (no name attr), matched by label
 *      "Yes, I am a Sri Lankan Resident" / "No, I am not a Sri Lankan Resident" -> Next
 *   2. From Account* (custom dropdown, loads async as a skeleton) + terms (annual fee
 *      LKR 500.00, e-Statement, SMS alerts). Next enables once the skeleton clears -> Next
 *   3. Agreement checkbox ("I have read and understood ... agree to be bound ...") +
 *      6 x input.otp-box (OTP sent to mobile/email) -> Confirm
 */
class WebCardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.applyTile = page.getByRole("button", { name: /web card/i }).first();

    this.modal = page.locator("div.fixed.inset-0.z-50").first();
    this.heading = this.modal.getByText("Web Card Apply", { exact: true });
    this.residentYes = page.getByText(/Yes, I am a Sri Lankan Resident/i).first();
    this.residentNo = page.getByText(/No, I am not a Sri Lankan Resident/i).first();
    this.termsText = this.modal.getByText(/annual fee/i);
    // The agreement acceptance is a CUSTOM checkbox rendered as a small square button
    // (appearance-none w-5 h-5 border-2), NOT a native <input type=checkbox>.
    this.agreementCheckbox = this.modal.locator('button[class*="appearance-none"]').first();
    this.agreementText = this.modal.getByText(/read and understood/i);
    this.otpBoxes = this.modal.locator("input.otp-box");

    this.nextButton = this.modal.getByRole("button", { name: /^next$/i });
    this.confirmButton = this.modal.getByRole("button", { name: /^confirm$/i });
    this.closeButton = this.modal.getByRole("button", { name: /^close$/i });
  }

  /**
   * Opens the Apply Web Card modal. The tile renders disabled while the dashboard loads,
   * so wait for it to become enabled before clicking.
   */
  async openApply() {
    await expect(this.applyTile, "The 'Apply Web Card' tile should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await expect(
      this.applyTile,
      "The 'Apply Web Card' tile should become enabled (it is disabled while the dashboard loads). If it stays " +
        "disabled, the logged-in account is not eligible to open a web card."
    ).toBeEnabled({ timeout: TIMEOUTS.LOAD });
    await this.applyTile.click();
    await expect(this.heading, "The 'Web Card Apply' modal should open").toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /** ASSERTION: step 1 (resident question) is shown, and Next is gated on it. */
  async assertResidentStep() {
    await expect(this.residentYes, "Step 1: the 'Sri Lankan Resident' option should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.nextButton, "Step 1: Next should be disabled until a resident type is chosen").toBeDisabled();
  }

  /** Step 1: choose resident type, then Next. */
  async selectResidentAndContinue(type = "Resident") {
    const option = /non/i.test(type) ? this.residentNo : this.residentYes;
    await option.click();
    await expect(this.nextButton, "Next should enable once a resident type is chosen").toBeEnabled({ timeout: TIMEOUTS.UI });
    await this.nextButton.click();
  }

  /**
   * Step 2: the terms screen. The From Account is a custom dropdown that loads async
   * (skeleton) and defaults, so just wait for the skeleton to clear and Next to enable.
   */
  async assertTermsStep() {
    await expect(this.termsText, "Step 2: the web card terms (annual fee) should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  async continueThroughTerms() {
    await this.page
      .waitForFunction(
        () => {
          const m = document.querySelector("div.fixed.inset-0.z-50");
          if (!m) return false;
          const next = Array.from(m.querySelectorAll("button")).find((b) => /^next$/i.test(b.textContent.trim()));
          return m.querySelectorAll(".animate-pulse").length === 0 && next && !next.disabled;
        },
        null,
        { timeout: 40_000 }
      )
      .catch(() => {});
    await expect(this.nextButton, "Step 2: Next should be enabled once the From Account list has loaded").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.nextButton.click();
  }

  /** ASSERTION: step 3 (agreement + OTP) is reached. */
  async assertAgreementOtpStep() {
    await expect(this.otpBoxes.first(), "Step 3: the web card OTP boxes should be shown").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await expect(this.agreementText, "Step 3: the agreement acceptance text should be shown").toBeVisible();
  }

  /**
   * Step 3: accept the agreement and confirm with the OTP.
   *
   * MANUAL BY DEFAULT: a real OTP is sent to the phone/email, and the agreement acceptance
   * is a custom control, so on the final screen you tick the agreement, enter the OTP, and
   * click Confirm yourself (run headed). The test waits until the OTP screen closes.
   *
   * Set IB_MANUAL_OTP=false for an unattended run: it best-effort accepts the agreement,
   * fills the bypass OTP and clicks Confirm (only works if the env accepts the bypass).
   */
  async acceptAgreementAndConfirm(otp) {
    if (process.env.IB_MANUAL_OTP !== "false") {
      const timeout = Number(process.env.IB_MANUAL_OTP_TIMEOUT || 180_000);
      // eslint-disable-next-line no-console
      console.log(
        `\n>>> MANUAL WEB CARD: on the final screen, tick the agreement checkbox, enter the OTP sent to your ` +
          `phone/email, and click Confirm (waiting up to ${Math.round(timeout / 1000)}s)...\n`
      );
      const done = await this.otpBoxes
        .first()
        .waitFor({ state: "hidden", timeout })
        .then(() => true)
        .catch(() => false);
      if (!done) {
        throw new Error(
          `Timed out after ${Math.round(timeout / 1000)}s waiting for the web card OTP to be entered and confirmed ` +
            "manually. Run headed so the browser is visible, and raise IB_MANUAL_OTP_TIMEOUT if needed."
        );
      }
      return;
    }

    // Unattended: accept the agreement (custom checkbox button), fill the bypass OTP, confirm.
    await this.agreementCheckbox.click({ force: true }).catch(() => {});
    await fillOtpBoxes(this.modal, otp);
    await expect(this.confirmButton, "Confirm should enable after agreeing and entering the OTP").toBeEnabled({
      timeout: TIMEOUTS.QUICK,
    });
    await this.confirmButton.click();
  }

  /** ASSERTION: the web card application succeeded. */
  async assertSuccess() {
    const success = this.page.getByText(/success|successful|submitted|applied|request.*received|congratulation/i).first();
    await expect(success, "A web card application success message should be shown").toBeVisible({ timeout: TIMEOUTS.LOAD });
  }
}

module.exports = { WebCardPage };
