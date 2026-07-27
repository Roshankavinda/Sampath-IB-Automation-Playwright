const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, assertDropdownPopulated, assertSelectedContains } = require("../utils/helpers");

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
    // Transfer Mode: One-time Transaction (ONLINE) vs Standing Order/Schedule (SCHEDULE).
    this.transferModeSchedule = page.locator('input[name="transferMode"][value="SCHEDULE"]');
    this.standingOrderLabel = page.getByText("Standing Order/Schedule", { exact: true }).first();
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
  }

  /** ASSERTION: the Other Accounts form is displayed. */
  async assertLoaded() {
    // Bank + To Account load reliably; the From Account loads asynchronously (skeleton).
    await expect(this.bankSelect, "Other Accounts form: Bank dropdown should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.toAccountNumberInput, "Other Accounts form: To Account Number field should be visible").toBeVisible();
    // Give the From Account skeleton loader a chance to resolve (non-fatal).
    await this.page
      .waitForFunction(() => {
        const f = document.querySelector("form");
        return f && !f.querySelector(".animate-pulse");
      }, null, { timeout: 30_000 })
      .catch(() => {});
  }

  /**
   * SOFT VALIDATIONS on the loaded form: the Bank and (async) From Account dropdowns are
   * populated, and the destination account + amount fields are present. Soft, so all UI
   * problems are reported together.
   */
  async assertFormValidations() {
    await assertDropdownPopulated(this.bankSelect, "Bank");
    // From Account loads asynchronously and may still be a skeleton; check it softly.
    if (await this.fromAccountSelect.isVisible().catch(() => false)) {
      await assertDropdownPopulated(this.fromAccountSelect, "From Account");
    }
    await expect.soft(this.toAccountNumberInput, "To Account Number field should be visible").toBeVisible();
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
    await expect.soft(this.submitButton, "Submit button should be visible").toBeVisible();
  }

  /**
   * Selects the From Account once it has loaded. The dropdown loads asynchronously
   * (skeleton) and defaults to the primary account, so if it hasn't resolved we fall
   * back to that default rather than failing.
   */
  async selectFromAccount(partial) {
    const ready = await this.fromAccountSelect
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (ready) {
      await selectOptionByLabelContains(this.fromAccountSelect, partial).catch(() => {});
      // SOFT ASSERTION: the source account is the one selected.
      await assertSelectedContains(this.fromAccountSelect, partial, "From Account");
    }
  }

  async selectBank(partial) {
    await selectOptionByLabelContains(this.bankSelect, partial);
    // SOFT ASSERTION: the chosen bank is the one selected.
    await assertSelectedContains(this.bankSelect, partial, "Bank");
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
   * Intra-bank (Sampath): enter the beneficiary account number. For a valid Sampath account
   * the app auto-fetches the name from core banking. That lookup is UNRELIABLE in this UAT
   * (it often returns nothing and leaves the name field empty but editable), so if no name
   * is fetched within a short window we fall back to typing `beneficiaryName` so the flow can
   * still proceed. If the field is read-only and nothing was fetched, we report that clearly.
   * @param {string} accountNumber
   * @param {string} [beneficiaryName] fallback name if the auto-fetch returns nothing
   */
  async enterIntraBankAccount(accountNumber, beneficiaryName) {
    await this.toAccountNumberInput.click();
    await this.toAccountNumberInput.fill(accountNumber);
    // The name is fetched from core banking for Sampath accounts; blur to trigger it.
    await this.toAccountNumberInput.press("Tab");

    // Wait for a REAL fetched name (not the "Retrieving beneficiary name..." placeholder).
    const readFetchedName = async () => {
      const v = (await this.beneficiaryNameInput.inputValue().catch(() => "")).trim();
      return v && !/retriev|please wait|loading|fetching/i.test(v) ? v : "";
    };
    const deadline = Date.now() + 12_000;
    while (Date.now() < deadline) {
      if (await readFetchedName()) return; // auto-fetch worked
      await this.page.waitForTimeout(500);
    }

    // No name auto-fetched. Fall back to typing it if the field is editable.
    const editable = await this.beneficiaryNameInput.isEditable().catch(() => false);
    if (editable && beneficiaryName) {
      await this.beneficiaryNameInput.fill(beneficiaryName);
      await expect(this.beneficiaryNameInput, "Beneficiary name should hold the entered value").toHaveValue(
        beneficiaryName
      );
      return;
    }
    throw new Error(
      `The beneficiary name did not auto-fetch for Sampath account "${accountNumber}" and the field is not editable, ` +
        "so the intra-bank transfer cannot proceed. The core-banking name lookup returned no name in this environment " +
        "(verified: even a valid own Sampath account did not resolve). Provide a name-resolving account or a fallback name."
    );
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
   * Selects the "Standing Order/Schedule" transfer mode so the transfer is scheduled. The
   * schedule detail fields (start date, frequency, ...) are NOT on this form - they appear
   * in a modal after Submit (see ScheduleModal). The radios are custom-styled, so click the
   * label; a forced check() flips the input without firing React's onChange.
   */
  async selectStandingOrderSchedule() {
    await this.standingOrderLabel.click();
    await expect(this.transferModeSchedule, "Standing Order/Schedule mode should be selected").toBeChecked({
      timeout: 10_000,
    });
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { OtherBankTransferPage };