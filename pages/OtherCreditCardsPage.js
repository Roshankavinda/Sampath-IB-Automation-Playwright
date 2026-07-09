const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, selectTransferMode, fillDateField } = require("../utils/helpers");

/**
 * Send Money > Other Credit Cards form.
 * Pay a credit card (own or other-bank card) by entering the card number and amount.
 *
 * // VERIFY against the live app: the field name attributes below. They mirror the
 * // Own/Other Bank forms (accountFrom, amount, transferMode, Submit); the card
 * // number field name is a best-guess and should be confirmed from the app source.
 */
class OtherCreditCardsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.cardNumberInput = page
      .locator('input[name="cardNumber"], input[name="creditCardNumber"], input[name="toCardNumber"]')
      .first();
    this.beneficiaryNameInput = page.locator('input[name="accountName"], input[name="beneficiaryName"]').first();
    this.amountInput = page.locator('input[name="amount"]');
    this.beneficiaryRemarkInput = page.locator('input[name="beneficiaryRemark"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.effectiveDateInput = page.locator('input[name="effectiveDate"], input[type="date"]').first();
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
  }

  /** ASSERTION: the Other Credit Cards form is displayed. */
  async assertLoaded() {
    await expect(this.fromAccountSelect, "Other Credit Cards form: From Account dropdown should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.cardNumberInput, "Other Credit Cards form: Card Number field should be visible").toBeVisible();
    await expect(this.amountInput, "Other Credit Cards form: Amount field should be visible").toBeVisible();
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount);

    await this.cardNumberInput.click();
    await this.cardNumberInput.fill(data.cardNumber);

    if (data.beneficiaryName && (await this.beneficiaryNameInput.isEditable().catch(() => false))) {
      await this.beneficiaryNameInput.fill(data.beneficiaryName);
    }

    await this.amountInput.fill(data.amount);
    if (data.beneficiaryRemark && (await this.beneficiaryRemarkInput.isVisible().catch(() => false))) {
      await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
    }

    // ASSERTION: entered values are reflected in the form.
    await expect(this.amountInput, "Amount field should contain the entered amount").toHaveValue(
      new RegExp(data.amount)
    );
    await expect(this.cardNumberInput, "Card number field should hold the entered value").toHaveValue(
      new RegExp(data.cardNumber.slice(-4))
    );
  }

  async ensureOneTimeTransaction() {
    const oneTime = this.transferModeRadios.first();
    if ((await oneTime.count()) > 0 && !(await oneTime.isChecked().catch(() => false))) {
      await oneTime.check({ force: true }).catch(() => {});
    }
  }

  /** @param {"one-time"|"scheduled"} mode */
  async setTransferMode(mode, schedule = {}) {
    if (mode === "one-time") return this.ensureOneTimeTransaction();
    await selectTransferMode(this.transferModeRadios, "Scheduled");
    if (schedule.effectiveDate) await fillDateField(this.effectiveDateInput, schedule.effectiveDate);
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { OtherCreditCardsPage };
