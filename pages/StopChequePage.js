const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Quick Actions > Stop Cheque — request a stop-payment on a cheque.
 * Flow: choose account -> cheque number -> reason -> Submit -> OTP/confirmation.
 *
 * // VERIFY against the live app: heading text and field name attributes below.
 */
class StopChequePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/stop cheque|stop payment/i).first();
    this.accountSelect = page.locator('select[name="account"], select[name="accountFrom"]').first();
    this.chequeNumberInput = page.locator('input[name="chequeNumber"], input[name="chequeNo"]').first();
    this.reasonSelect = page.locator('select[name="reason"]').first();
    this.reasonInput = page.locator('input[name="reason"]').first();
    this.submitButton = page.getByRole("button", { name: /^(submit|proceed|next|confirm)$/i }).first();
  }

  /** ASSERTION: the Stop Cheque form is displayed. */
  async assertLoaded() {
    await expect(this.accountSelect, "Stop Cheque form: account dropdown should be visible").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.chequeNumberInput, "Stop Cheque form: cheque number field should be visible").toBeVisible();
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.accountSelect, data.account);
    await this.chequeNumberInput.fill(data.chequeNumber);

    if (data.reason) {
      if (await this.reasonSelect.isVisible().catch(() => false)) {
        await selectOptionByLabelContains(this.reasonSelect, data.reason);
      } else if (await this.reasonInput.isVisible().catch(() => false)) {
        await this.reasonInput.fill(data.reason);
      }
    }

    await expect(this.chequeNumberInput, "Cheque number should hold the entered value").toHaveValue(
      new RegExp(data.chequeNumber)
    );
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { StopChequePage };
