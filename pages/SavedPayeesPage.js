const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Send Money > Saved Payees form.
 * Flow: pick a saved payee tile/row -> From Account -> Amount -> remark -> Submit.
 * The beneficiary details are pre-filled from the saved payee, so this form is
 * shorter than a fresh Other Bank transfer.
 *
 * // VERIFY against the live app: how a saved payee is selected (tile vs dropdown)
 * // and the field name attributes below.
 */
class SavedPayeesPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.amountInput = page.locator('input[name="amount"]');
    this.beneficiaryRemarkInput = page.locator('input[name="beneficiaryRemark"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: "Submit", exact: true });
  }

  /** ASSERTION: the Saved Payees list is displayed. */
  async assertLoaded() {
    // Either the list renders payee tiles, or an empty-state message shows.
    const anyPayee = this.page.getByText(/saved payee|payee|beneficiary/i).first();
    await expect(anyPayee, "Saved Payees section should be visible").toBeVisible({ timeout: 60_000 });
  }

  /** Selects a saved payee by its name/nickname (tile or list row). */
  async selectPayee(payeeName) {
    const tile = this.page.getByText(new RegExp(payeeName, "i")).first();
    await expect(tile, `Saved payee "${payeeName}" should be visible`).toBeVisible({ timeout: 30_000 });
    await tile.click();

    // ASSERTION: the payment form loaded after choosing the payee.
    await expect(this.fromAccountSelect, "Saved-payee form: From Account dropdown should be visible").toBeVisible({
      timeout: 30_000,
    });
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount);
    await this.amountInput.fill(data.amount);
    if (data.beneficiaryRemark && (await this.beneficiaryRemarkInput.isVisible().catch(() => false))) {
      await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
    }
    await expect(this.amountInput, "Amount field should contain the entered amount").toHaveValue(
      new RegExp(data.amount)
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

module.exports = { SavedPayeesPage };
