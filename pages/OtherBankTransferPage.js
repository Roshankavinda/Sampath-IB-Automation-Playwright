const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");


class OtherBankTransferPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText("Make Transactions", { exact: true });
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.bankSelect = page.locator('select[name="bank"]');
    this.purposeSelect = page.locator('select[name="purposeofTransfer"]');
    this.toAccountNumberInput = page.locator('input[name="toAccountNumber"]');
    this.beneficiaryNameInput = page.locator('input[name="accountName"]');
    this.amountInput = page.locator('input[name="amount"]');
    this.beneficiaryRemarkInput = page.locator('input[name="beneficiaryRemark"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
  }

  /** ASSERTION: the Other Accounts form is displayed. */
  async assertLoaded() {
    await expect(this.fromAccountSelect, "Other Accounts form: From Account dropdown should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.bankSelect, "Other Accounts form: Bank dropdown should be visible").toBeVisible();
    await expect(this.toAccountNumberInput, "Other Accounts form: To Account Number field should be visible").toBeVisible();
  }

  async selectFromAccount(partial) {
    await selectOptionByLabelContains(this.fromAccountSelect, partial);
  }

  async selectBank(partial) {
    await selectOptionByLabelContains(this.bankSelect, partial);
  }

  /**
   * Enters the beneficiary account number and types the beneficiary name.
   * (No auto-fetch for other banks; the name field is editable.)
   */
  async enterToAccountAndBeneficiary(accountNumber, beneficiaryName) {
    await this.toAccountNumberInput.click();
    await this.toAccountNumberInput.fill(accountNumber);
    await expect(this.beneficiaryNameInput, "Beneficiary name field should be editable").toBeEditable({
      timeout: 15_000,
    });
    await this.beneficiaryNameInput.fill(beneficiaryName);
    // ASSERTION: beneficiary name reflects the entered value.
    await expect(this.beneficiaryNameInput, "Beneficiary name should hold the entered value").toHaveValue(
      beneficiaryName
    );
  }

  async fillAmountAndDetails(data) {
  await this.amountInput.fill(data.amount);
  await selectOptionByLabelContains(this.purposeSelect, data.purpose);
  await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
  await expect(this.amountInput, "Amount field should contain the entered amount").toHaveValue(
    new RegExp(data.amount)
  );
}

  async ensureOneTimeTransaction() {
    const oneTime = this.transferModeRadios.first();
    if (!(await oneTime.isChecked())) {
      await oneTime.check({ force: true });
    }
    await expect(oneTime, "One-time Transaction mode should be selected").toBeChecked();
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { OtherBankTransferPage };