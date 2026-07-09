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

  async enterOtpAndConfirm(otp) {
    await fillOtpBoxes(this.page, otp);
    await expect(this.confirmButton, "Confirm button should be enabled after entering OTP").toBeEnabled({
      timeout: 10_000,
    });
    await this.confirmButton.click();
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
