const { expect } = require("@playwright/test");
const { fillOtpBoxes, getToastText } = require("../utils/helpers");

/**
 * Transaction confirmation + OTP popup (PaymentConfirmation.tsx).
 * Shows the transaction details and 6 x input.otp-box, then a confirm button.
 */
class ConfirmationPopup {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.otpBoxes = page.locator("input.otp-box");
    this.confirmButton = page.getByRole("button", { name: /confirm|submit|proceed|verify/i }).last();
  }

  /**
   * ASSERTION: the OTP/confirmation popup appeared after Submit.
   * Races the OTP boxes against the app's error toast so that a "Session TimeOut"
   * (a known UAT transaction/OTP-service failure that bounces to the dashboard)
   * is reported clearly and quickly instead of as a vague timeout.
   */
  async assertVisible() {
    const errorToast = this.page
      .getByText(/session\s*time\s*out|session expired|timed out|failed|declined/i)
      .first();

    const outcome = await Promise.race([
      this.otpBoxes.first().waitFor({ state: "visible", timeout: 25_000 }).then(() => "otp").catch(() => null),
      errorToast.waitFor({ state: "visible", timeout: 25_000 }).then(() => "error").catch(() => null),
    ]);

    if (outcome === "otp") return;

    const errText = await errorToast.innerText().catch(() => "");
    const toast = errText || (await getToastText(this.page, 2_000));
    if (/session\s*time\s*out|session expired|timed out/i.test(toast)) {
      throw new Error(
        `Transaction was not accepted: the app returned "${toast.trim()}" on Submit and redirected to the dashboard. ` +
          "This is an environment/backend issue (transaction or OTP service), not a locator problem."
      );
    }
    throw new Error(
      "OTP/confirmation popup did not appear after Submit." + (toast ? ` Application showed: "${toast.trim()}".` : "")
    );
  }

  /** Soft ASSERTIONS on displayed details. */
  async verifyDetails({ amount, beneficiaryName } = {}) {
    if (amount) {
      await expect
        .soft(this.page.getByText(new RegExp(amount.replace(".", "\\."))).first(), "Popup should display the amount")
        .toBeVisible({ timeout: 10_000 });
    }
    if (beneficiaryName) {
      await expect
        .soft(this.page.getByText(new RegExp(beneficiaryName, "i")).first(), "Popup should display the beneficiary")
        .toBeVisible({ timeout: 10_000 });
    }
  }

  /**
   * Enters the transaction OTP and confirms.
   *
   * TRANSACTION OTP IS MANUAL BY DEFAULT: a real OTP is sent to the registered phone, so
   * the test pauses (run headed) for you to type it in and click Confirm. Only the LOGIN
   * OTP uses the UAT bypass code - it is handled separately in LoginPage, not here.
   *
   * For a fully unattended/CI run, set IB_MANUAL_OTP=false to auto-fill the bypass code
   * here too.
   */
  async enterOtpAndConfirm(otp) {
    if (process.env.IB_MANUAL_OTP !== "false") return this.waitForManualOtp();

    await fillOtpBoxes(this.page, otp);
    await expect(this.confirmButton, "Confirm button should be enabled after entering OTP").toBeEnabled({
      timeout: 10_000,
    });
    await this.confirmButton.click();
  }

  /**
   * Manual-OTP mode: pause while the OTP that was sent to the phone is typed in by hand
   * and Confirm is clicked. Completion is detected by the OTP popup closing.
   */
  async waitForManualOtp() {
    const timeout = Number(process.env.IB_MANUAL_OTP_TIMEOUT || 180_000);
    // eslint-disable-next-line no-console
    console.log(
      `\n>>> MANUAL OTP: enter the OTP sent to your phone in the browser and click Confirm ` +
        `(waiting up to ${Math.round(timeout / 1000)}s)...\n`
    );
    const done = await this.otpBoxes
      .first()
      .waitFor({ state: "hidden", timeout })
      .then(() => true)
      .catch(() => false);
    if (!done) {
      throw new Error(
        `Timed out after ${Math.round(timeout / 1000)}s waiting for the transaction OTP to be entered and confirmed ` +
          "manually. Run headed so the browser is visible (the per-feature npm scripts already pass --headed), and " +
          "raise IB_MANUAL_OTP_TIMEOUT if you need longer. For an unattended run, set IB_MANUAL_OTP=false to use the " +
          "bypass code instead."
      );
    }
  }

  /** ASSERTION: transaction success is shown. */
  async assertSuccess() {
    const success = this.page.getByText(/success|successful|completed|receipt/i).first();
    const ok = await success
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      const toast = await getToastText(this.page, 2_000);
      throw new Error(
        "Transaction success confirmation was not displayed." + (toast ? ` Application showed: "${toast}".` : "")
      );
    }
  }
}

module.exports = { ConfirmationPopup };
