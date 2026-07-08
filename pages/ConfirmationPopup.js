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

  /** ASSERTION: the OTP/confirmation popup appeared after Submit. */
  async assertVisible() {
    const appeared = await this.otpBoxes
      .first()
      .waitFor({ state: "visible", timeout: 25_000 })
      .then(() => true)
      .catch(() => false);

    if (!appeared) {
      const toast = await getToastText(this.page, 2_000);
      throw new Error(
        "OTP/confirmation popup did not appear after Submit." +
          (toast ? ` Application showed: "${toast}".` : "")
      );
    }
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
