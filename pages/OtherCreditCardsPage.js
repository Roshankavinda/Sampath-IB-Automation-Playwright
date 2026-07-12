const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Send Money > Other Credit Cards — pay another bank's credit card by card number/CAN.
 * Real fields (confirmed against the live app):
 *   From Account  - loads asynchronously (skeleton), defaults to the primary account
 *   input[name="CAN"]                - beneficiary credit card number / CAN
 *   input[name="reCAN"]              - re-enter credit card number / CAN
 *   input[name="cardName"]           - receiver's account name
 *   input[name="amount"]             - Amount
 *   select[name="purposeofTransfer"] - Purpose
 *   input[name="senderRemark"]       - Sender Remark
 *   input[name="beneficiaryRemark"]  - Beneficiary Remark
 *   input[name="transferMode"]       - One-time / Standing Order radios
 */
class OtherCreditCardsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.cardNumberInput = page.locator('input[name="CAN"]');
    this.reCardNumberInput = page.locator('input[name="reCAN"]');
    this.cardNameInput = page.locator('input[name="cardName"]');
    this.bankSelect = page.locator('select[name="bank"]'); // card-issuing bank (required)
    this.amountInput = page.locator('input[name="amount"]');
    this.purposeSelect = page.locator('select[name="purposeofTransfer"]');
    this.senderRemarkInput = page.locator('input[name="senderRemark"]');
    this.beneficiaryRemarkInput = page.locator('input[name="beneficiaryRemark"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
  }

  /** ASSERTION: the Other Credit Cards form is displayed. */
  async assertLoaded() {
    await expect(this.cardNumberInput, "Other Credit Cards form: Card Number (CAN) field should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.amountInput, "Other Credit Cards form: Amount field should be visible").toBeVisible();
    // From Account loads asynchronously (skeleton loader); wait for it to resolve.
    await this.page
      .waitForFunction(() => {
        const f = document.querySelector("form");
        return f && !f.querySelector(".animate-pulse");
      }, null, { timeout: 20_000 })
      .catch(() => {});
  }

  async fillForm(data) {
    // From Account defaults to primary once loaded; select a specific one only if present.
    if (data.fromAccount && (await this.fromAccountSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount).catch(() => {});
    }

    await this.cardNumberInput.fill(data.cardNumber);
    await this.reCardNumberInput.fill(data.cardNumber);
    if (data.cardName) await this.cardNameInput.fill(data.cardName);
    // The card-issuing bank is required (defaults to "Select Bank").
    if (data.bank) await selectOptionByLabelContains(this.bankSelect, data.bank);
    await this.amountInput.fill(data.amount);
    if (data.purpose && (await this.purposeSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.purposeSelect, data.purpose);
    }
    if (data.senderRemark && (await this.senderRemarkInput.isVisible().catch(() => false))) {
      await this.senderRemarkInput.fill(data.senderRemark);
    }
    if (data.beneficiaryRemark && (await this.beneficiaryRemarkInput.isVisible().catch(() => false))) {
      await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
    }

    // ASSERTION: entered values are reflected in the form.
    await expect(this.amountInput, "Amount field should contain the entered amount").toHaveValue(
      new RegExp(data.amount)
    );
    await expect(this.cardNumberInput, "Card number should hold the entered value").toHaveValue(
      new RegExp(data.cardNumber.slice(-4))
    );
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

module.exports = { OtherCreditCardsPage };
