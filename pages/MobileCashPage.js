const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, assertDropdownPopulated, assertSelectedContains } = require("../utils/helpers");

/**
 * Send Money > Mobile Cash form (cardless cash to a receiver's NIC + mobile number).
 * Real fields (confirmed against the live app):
 *   From Account  - a display card defaulted to the primary account (no control to pick)
 *   input[name="NIC"]                 - Receiver's NIC (without V/X)
 *   input[name="mobileNo"]            - Receiver's Mobile Number
 *   input[name="reMobileNo"]          - Re-enter Receiver's Mobile Number
 *   input[name="name"]               - Receiver's Name
 *   select[name="purposeofTransfer"] - Purpose
 *   input[name="amount"]             - Mobile Cash Amount
 *   input[name="remark"]             - Remarks
 * There is no transfer-mode selector on this form.
 */
class MobileCashPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.nicInput = page.locator('input[name="NIC"]');
    this.mobileNumberInput = page.locator('input[name="mobileNo"]');
    this.reMobileNumberInput = page.locator('input[name="reMobileNo"]');
    this.receiverNameInput = page.locator('input[name="name"]');
    this.purposeSelect = page.locator('select[name="purposeofTransfer"]');
    this.amountInput = page.locator('input[name="amount"]');
    this.remarkInput = page.locator('input[name="remark"]');
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
  }

  /** ASSERTION: the Mobile Cash form is displayed. */
  async assertLoaded() {
    await expect(this.mobileNumberInput, "Mobile Cash form: Receiver's Mobile Number field should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.nicInput, "Mobile Cash form: Receiver's NIC field should be visible").toBeVisible();
    // The From Account control loads asynchronously (skeleton loader). Give it a
    // chance to resolve; non-fatal here so validation still runs (see submit()).
    await this.page
      .waitForFunction(() => {
        const f = document.querySelector("form");
        return f && !f.querySelector(".animate-pulse");
      }, null, { timeout: 15_000 })
      .catch(() => {});
  }

  /**
   * The app intermittently bounces back to the Dashboard while the Mobile Cash form is
   * open. Without this guard the next fill() just times out on a missing locator, which
   * hides what actually happened.
   */
  async assertFormStillOpen() {
    const onForm = await this.nicInput
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!onForm) {
      throw new Error(
        `The Mobile Cash form is no longer on screen (current URL: ${this.page.url()}). ` +
          "The app navigated away from Send Money - it dropped back to the Dashboard before the form could be filled."
      );
    }
  }

  /**
   * SOFT VALIDATIONS on the loaded form: the Purpose dropdown is populated and every
   * receiver field is present. (Mobile Cash has no From-account dropdown - it shows the
   * primary account as a read-only display card.) Soft, so all UI problems report together.
   */
  async assertFormValidations() {
    await assertDropdownPopulated(this.purposeSelect, "Purpose");
    await expect.soft(this.nicInput, "Receiver's NIC field should be visible").toBeVisible();
    await expect.soft(this.mobileNumberInput, "Receiver's Mobile Number field should be visible").toBeVisible();
    await expect.soft(this.reMobileNumberInput, "Re-enter Mobile Number field should be visible").toBeVisible();
    await expect.soft(this.receiverNameInput, "Receiver's Name field should be visible").toBeVisible();
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
    await expect.soft(this.submitButton, "Submit button should be visible").toBeVisible();
  }

  async fillForm(data) {
    await this.assertFormStillOpen();
    if (data.nic) await this.nicInput.fill(data.nic);
    await this.mobileNumberInput.fill(data.mobileNumber);
    await this.reMobileNumberInput.fill(data.mobileNumber);
    if (data.receiverName) await this.receiverNameInput.fill(data.receiverName);
    if (data.purpose) {
      await selectOptionByLabelContains(this.purposeSelect, data.purpose);
      // SOFT ASSERTION: the chosen purpose is the one selected.
      await assertSelectedContains(this.purposeSelect, data.purpose, "Purpose");
    }
    if (data.amount) await this.amountInput.fill(data.amount);
    if (data.remark) await this.remarkInput.fill(data.remark);

    // ASSERTION: the entered mobile number is reflected in the form.
    await expect(this.mobileNumberInput, "Mobile number should hold the entered value").toHaveValue(
      new RegExp(data.mobileNumber.slice(-4))
    );
  }

  /** No transfer-mode selector on the Mobile Cash form. */
  async ensureOneTimeTransaction() {}

  async submit() {
    // Distinguish a stuck From Account loader from ordinary form validation so the
    // failure is actionable rather than a vague "Submit disabled".
    if (!(await this.submitButton.isEnabled().catch(() => false))) {
      const loaderStuck = await this.page.locator("form .animate-pulse").first().isVisible().catch(() => false);
      if (loaderStuck) {
        throw new Error(
          "Mobile Cash 'From Account' never loads: its skeleton loader spins forever, so Submit stays disabled and " +
            "this transaction cannot be completed. The server returns HTTP 500 " +
            '{"title":"failed","message":"Internal server error","code":500} for the Mobile Cash eligible-accounts ' +
            "request, so the account list is never populated. This is an environment/backend defect, not a test issue - " +
            "the positive path cannot pass until the backend serves the Mobile Cash From Account list."
        );
      }
    }
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { MobileCashPage };
