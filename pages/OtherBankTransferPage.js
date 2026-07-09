const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, selectTransferMode, fillDateField } = require("../utils/helpers");

/**
 * Send Money > Other Accounts form. Used for BOTH:
 *  - Intra Bank (bank = Sampath): the beneficiary name is auto-fetched (read-only).
 *  - Other Bank (SLIPS/CEFTS): the beneficiary name is typed manually.
 */
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
    this.senderRemarkInput = page.locator('input[name="senderRemark"]');
    this.beneficiaryRemarkInput = page.locator('input[name="beneficiaryRemark"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
    // Scheduled / recurring transfer fields. VERIFY name attributes against the live app.
    this.effectiveDateInput = page.locator('input[name="effectiveDate"], input[type="date"]').first();
    this.endDateInput = page.locator('input[name="endDate"]').first();
    this.frequencySelect = page.locator('select[name="frequency"]');
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

  /**
   * Intra-bank (Sampath): enter the beneficiary account number and let the app
   * auto-fetch the name. ASSERTION: the name field becomes populated and read-only.
   */
  async enterIntraBankAccount(accountNumber) {
    await this.toAccountNumberInput.click();
    await this.toAccountNumberInput.fill(accountNumber);
    // The name is fetched from core banking for Sampath accounts; blur to trigger it.
    await this.toAccountNumberInput.press("Tab");
    await expect
      .poll(async () => (await this.beneficiaryNameInput.inputValue().catch(() => "")).trim().length, {
        timeout: 20_000,
        message: "Beneficiary name should auto-fetch for a valid Sampath (intra-bank) account",
      })
      .toBeGreaterThan(0);
  }

  async fillAmountAndDetails(data) {
    await this.amountInput.fill(data.amount);
    // Purpose is not always shown for intra-bank transfers - fill it only if present.
    if (data.purpose && (await this.purposeSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.purposeSelect, data.purpose);
    }
    if (data.senderRemark && (await this.senderRemarkInput.isVisible().catch(() => false))) {
      await this.senderRemarkInput.fill(data.senderRemark);
    }
    if (data.beneficiaryRemark && (await this.beneficiaryRemarkInput.isVisible().catch(() => false))) {
      await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
    }
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

  /**
   * Select a transfer mode and, for scheduled/recurring, fill the schedule fields.
   * @param {"one-time"|"scheduled"|"recurring"} mode
   * @param {{ effectiveDate?: string, endDate?: string, frequency?: string }} [schedule]
   */
  async setTransferMode(mode, schedule = {}) {
    if (mode === "one-time") return this.ensureOneTimeTransaction();

    await selectTransferMode(this.transferModeRadios, mode === "recurring" ? "Recurring" : "Scheduled");

    if (schedule.effectiveDate) await fillDateField(this.effectiveDateInput, schedule.effectiveDate);
    if (mode === "recurring") {
      if (schedule.frequency && (await this.frequencySelect.isVisible().catch(() => false))) {
        await selectOptionByLabelContains(this.frequencySelect, schedule.frequency);
      }
      if (schedule.endDate && (await this.endDateInput.isVisible().catch(() => false))) {
        await fillDateField(this.endDateInput, schedule.endDate);
      }
    }
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { OtherBankTransferPage };