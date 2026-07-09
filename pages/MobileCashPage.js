const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Send Money > Mobile Cash form (cardless cash withdrawal to a mobile number).
 *
 * // VERIFY against the live app: the field name attributes below. Amount is often
 * // a fixed denomination dropdown/tile rather than a free-text input, so fillAmount
 * // tolerates both a <select> and an <input>.
 */
class MobileCashPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.mobileNumberInput = page
      .locator('input[name="mobileNumber"], input[name="mobileNo"], input[name="recipientMobile"]')
      .first();
    this.amountInput = page.locator('input[name="amount"]').or(page.getByPlaceholder(/amount/i)).first();
    this.amountSelect = page.locator('select[name="amount"], select[name="denomination"]').first();
    this.remarkInput = page.locator('input[name="remark"], input[name="beneficiaryRemark"]').first();
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
  }

  /** ASSERTION: the Mobile Cash form is displayed. */
  async assertLoaded() {
    await expect(this.fromAccountSelect, "Mobile Cash form: From Account dropdown should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.mobileNumberInput, "Mobile Cash form: Mobile Number field should be visible").toBeVisible();
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount);

    await this.mobileNumberInput.click();
    await this.mobileNumberInput.fill(data.mobileNumber);
    await expect(this.mobileNumberInput, "Mobile number should hold the entered value").toHaveValue(
      new RegExp(data.mobileNumber.slice(-4))
    );

    // Amount may be a dropdown of denominations or a free-text input.
    if (await this.amountSelect.isVisible().catch(() => false)) {
      await selectOptionByLabelContains(this.amountSelect, data.amount);
    } else if (await this.amountInput.isEditable().catch(() => false)) {
      await this.amountInput.fill(data.amount);
    }

    if (data.remark && (await this.remarkInput.isVisible().catch(() => false))) {
      await this.remarkInput.fill(data.remark);
    }
  }

  async ensureOneTimeTransaction() {
    const oneTime = this.transferModeRadios.first();
    if ((await oneTime.count()) > 0 && !(await oneTime.isChecked().catch(() => false))) {
      await oneTime.check({ force: true }).catch(() => {});
    }
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { MobileCashPage };
