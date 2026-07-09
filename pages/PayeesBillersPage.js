const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Payees & Billers management page (top-nav "Payees & Billers").
 * Flow: Add Payee -> choose payee type (bank) -> account number ->
 *       beneficiary name -> nickname -> Save -> OTP/confirmation.
 *
 * // VERIFY against the live app: button labels ("Add Payee") and field name
 * // attributes below. They follow the same conventions as the transfer forms.
 */
class PayeesBillersPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/payees\s*&\s*billers|manage payees|beneficiaries/i).first();
    this.addPayeeButton = page.getByRole("button", { name: /add payee|add beneficiary|new payee/i }).first();
    this.payeeTypeSelect = page.locator('select[name="payeeType"], select[name="beneficiaryType"]').first();
    this.bankSelect = page.locator('select[name="bank"]');
    this.accountNumberInput = page.locator('input[name="toAccountNumber"], input[name="accountNumber"]').first();
    this.beneficiaryNameInput = page.locator('input[name="accountName"], input[name="beneficiaryName"]').first();
    this.nicknameInput = page.locator('input[name="nickname"], input[name="payeeName"], input[name="displayName"]').first();
    this.saveButton = page.getByRole("button", { name: /^(save|add|submit|confirm)$/i }).first();
  }

  /** ASSERTION: the Payees & Billers page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "Payees & Billers heading should be visible").toBeVisible({ timeout: 60_000 });
  }

  async startAddPayee() {
    await expect(this.addPayeeButton, "'Add Payee' button should be visible").toBeVisible({ timeout: 30_000 });
    await this.addPayeeButton.click();
    await expect(this.accountNumberInput, "Add-payee form: account number field should be visible").toBeVisible({
      timeout: 30_000,
    });
  }

  async fillPayee(data) {
    if (data.payeeType && (await this.payeeTypeSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.payeeTypeSelect, data.payeeType);
    }
    if (data.bank && (await this.bankSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.bankSelect, data.bank);
    }
    await this.accountNumberInput.fill(data.accountNumber);
    if (await this.beneficiaryNameInput.isEditable().catch(() => false)) {
      await this.beneficiaryNameInput.fill(data.beneficiaryName);
    }
    if (data.nickname && (await this.nicknameInput.isVisible().catch(() => false))) {
      await this.nicknameInput.fill(data.nickname);
    }

    // ASSERTION: the account number was entered.
    await expect(this.accountNumberInput, "Account number should hold the entered value").toHaveValue(
      new RegExp(data.accountNumber.slice(-4))
    );
  }

  async save() {
    await expect(this.saveButton, "Save button should be enabled once the payee form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.saveButton.click();
  }

  /** ASSERTION: the newly added payee appears in the saved list. */
  async assertPayeeListed(nameOrNickname) {
    const row = this.page.getByText(new RegExp(nameOrNickname, "i")).first();
    await expect(row, `Saved payee "${nameOrNickname}" should appear in the list`).toBeVisible({ timeout: 30_000 });
  }
}

module.exports = { PayeesBillersPage };
