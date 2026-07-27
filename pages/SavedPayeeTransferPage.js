const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, assertDropdownPopulated, assertSelectedContains } = require("../utils/helpers");

/**
 * Fund Transfer by a SAVED PAYEE.
 * All selectors confirmed against the live app.
 *
 * Flow: Payees & Billers > Saved Payees -> the payees are TABLE ROWS (Account Number |
 * Account Name | Nickname | Bank Name | Transaction Type), each with an "Add to List."
 * checkbox and Pencil/Bin action icons (edit/delete - they do NOT start a payment).
 * Ticking a payee's checkbox (or clicking its row) reveals "Pay Now", which opens the
 * transfer form:
 *    select[name="debitAccount"]                 - From Account
 *    input[name="transferMode"]                  - ONLINE (One-time) | SCHEDULE
 *    input[name="tranList.0.amount"]             - Amount
 *    select[name="tranList.0.purpose"]           - Purpose
 *    input[name="tranList.0.beneficiaryRemarks"] - Beneficiary Remarks
 * The submit control is a running total, e.g. "Transfer LKR 0.00" -> "Transfer LKR 100.00".
 */
class SavedPayeeTransferPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Saved Payees landing ("Saved Payees" also exists as a hidden nav item - match visible).
    this.heading = page.getByText("Saved Payees", { exact: true }).locator("visible=true").first();
    this.filtersPrompt = page.getByText(/Use filters to fetch different account types/i);
    this.addNewPayeeButton = page.getByRole("button", { name: "Add New Payee", exact: true });
    this.payeeRows = page.locator("table tbody tr");
    this.payNowButton = page.getByRole("button", { name: /pay now/i });

    // Transfer form (after "Pay Now").
    this.fromAccountSelect = page.locator('select[name="debitAccount"]');
    this.amountInput = page.locator('input[name="tranList.0.amount"]');
    this.purposeSelect = page.locator('select[name="tranList.0.purpose"]');
    this.beneficiaryRemarkInput = page.locator('input[name="tranList.0.beneficiaryRemarks"]');
    this.transferModeOnline = page.locator('input[name="transferMode"][value="ONLINE"]');
    // The submit button carries the running total, so match on its "Transfer LKR ..." prefix.
    this.submitButton = page.getByRole("button", { name: /^transfer\s+lkr/i }).first();
  }

  /** ASSERTION: the Saved Payees page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Saved Payees' heading should be visible").toBeVisible({ timeout: 60_000 });
    await expect(this.filtersPrompt, "The Saved Payees filter prompt should be visible").toBeVisible();
    await expect(this.addNewPayeeButton, "'Add New Payee' button should be visible").toBeVisible({ timeout: 60_000 });
  }

  /**
   * Ticks the saved payee's "Add to List." checkbox and opens its transfer form via
   * "Pay Now". Fails with an actionable message when the payee is not in the list.
   */
  async selectSavedPayee(payeeName) {
    const row = this.payeeRows.filter({ hasText: payeeName }).first();

    const found = await row
      .waitFor({ state: "visible", timeout: 60_000 })
      .then(() => true)
      .catch(() => false);

    if (!found) {
      // The app intermittently drops back to the Dashboard while this page is open.
      // Distinguish that from a genuinely empty payee list, otherwise the failure claims
      // there are no saved payees when there are.
      const stillHere = await this.addNewPayeeButton.isVisible().catch(() => false);
      if (!stillHere) {
        throw new Error(
          `The Saved Payees page is no longer on screen (current URL: ${this.page.url()}). The app navigated away - ` +
            "it dropped back to the Dashboard before the payee list could be read, so the payee could not be picked."
        );
      }

      const listed = await this.payeeRows.allInnerTexts().catch(() => []);
      throw new Error(
        `No saved payee matching "${payeeName}" is listed on the Saved Payees page. ` +
          (listed.length
            ? `Saved payees currently on the page: ${listed.map((t) => t.replace(/\s+/g, " ").trim()).join(" / ")}`
            : "The account has no saved payees at all - add one first.")
      );
    }

    // ASSERTION: the payee's details are the ones we expect to pay.
    await expect(row, `The saved payee "${payeeName}" should be listed`).toBeVisible();

    await row.locator('input[type="checkbox"]').check();

    await expect(this.payNowButton, "'Pay Now' should appear once a saved payee is selected").toBeVisible({
      timeout: 20_000,
    });
    await this.payNowButton.click();

    // ASSERTION: the transfer form opened for that payee.
    await expect(this.amountInput, "The transfer form (Amount) should open after 'Pay Now'").toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * SOFT VALIDATIONS on the Pay Now transfer form: the debit-account and Purpose
   * dropdowns are populated and the amount field is present. Soft, so all UI problems
   * report together. Call after selectSavedPayee() has opened the form.
   */
  async assertTransferFormValidations() {
    await assertDropdownPopulated(this.fromAccountSelect, "Debit (From) Account");
    if (await this.purposeSelect.isVisible().catch(() => false)) {
      await assertDropdownPopulated(this.purposeSelect, "Purpose");
    }
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
    await expect.soft(this.submitButton, "The 'Transfer LKR ...' button should be visible").toBeVisible();
  }

  /** Fills the debit account, amount, purpose and remarks; the payee is already fixed. */
  async fillTransfer(data) {
    if (data.fromAccount && (await this.fromAccountSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount).catch(() => {});
      // SOFT ASSERTION: the chosen debit account is the one selected.
      await assertSelectedContains(this.fromAccountSelect, data.fromAccount, "Debit (From) Account");
    }
    await this.amountInput.fill(data.amount);
    if (data.purpose && (await this.purposeSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.purposeSelect, data.purpose).catch(() => {});
      // SOFT ASSERTION: the chosen purpose is the one selected.
      await assertSelectedContains(this.purposeSelect, data.purpose, "Purpose");
    }
    if (data.beneficiaryRemark && (await this.beneficiaryRemarkInput.isVisible().catch(() => false))) {
      await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
    }

    // ASSERTION: the amount is reflected in the form. The field reformats what is typed
    // ("100" -> "LKR 100.00"), so compare the digits rather than the raw string.
    const digits = (s) => String(s).replace(/\D/g, "");
    await expect
      .poll(async () => digits(await this.amountInput.inputValue()), {
        timeout: 15_000,
        message: "Amount field should contain the entered amount",
      })
      .toContain(digits(data.amount));
  }

  /** Selects the One-time transfer mode (ONLINE) rather than a standing order. */
  async ensureOneTimeTransaction() {
    await this.transferModeOnline.check({ force: true }).catch(() => {});
  }

  async submit() {
    await expect(this.submitButton, "The 'Transfer LKR ...' button should be enabled once the form is valid")
      .toBeEnabled({ timeout: 20_000 });
    await this.submitButton.click();
  }
}

module.exports = { SavedPayeeTransferPage };
