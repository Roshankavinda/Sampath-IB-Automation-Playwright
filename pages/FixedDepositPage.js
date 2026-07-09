const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Quick Actions > Fixed Deposit — open a new FD.
 * Flow: choose funding account -> amount -> period/tenure -> maturity instruction
 *       -> Submit -> OTP/confirmation.
 *
 * // VERIFY against the live app: heading text and field name attributes below.
 * // Period and maturity instruction may be dropdowns or radio tiles; the helpers
 * // tolerate a <select>, and fall back to clicking a matching option label.
 */
class FixedDepositPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/fixed deposit|open (a )?fixed deposit|new fixed deposit/i).first();
    this.fromAccountSelect = page.locator('select[name="accountFrom"], select[name="fundingAccount"]').first();
    this.amountInput = page.locator('input[name="amount"], input[name="depositAmount"]').first();
    this.periodSelect = page.locator('select[name="period"], select[name="tenure"], select[name="term"]').first();
    this.maturitySelect = page
      .locator('select[name="maturityInstruction"], select[name="maturity"], select[name="onMaturity"]')
      .first();
    this.submitButton = page.getByRole("button", { name: /^(submit|open|proceed|next|confirm)$/i }).first();
  }

  /** ASSERTION: the Fixed Deposit form is displayed. */
  async assertLoaded() {
    await expect(this.fromAccountSelect, "Fixed Deposit form: funding account dropdown should be visible").toBeVisible({
      timeout: 60_000,
    });
    await expect(this.amountInput, "Fixed Deposit form: amount field should be visible").toBeVisible();
  }

  /** Selects an option that may be a <select> or a clickable tile/radio with a label. */
  async _selectOptionOrTile(select, label) {
    if (await select.isVisible().catch(() => false)) {
      await selectOptionByLabelContains(select, label);
      return;
    }
    const tile = this.page.getByText(new RegExp(label, "i")).first();
    if (await tile.isVisible().catch(() => false)) await tile.click();
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount);
    await this.amountInput.fill(data.amount);
    if (data.period) await this._selectOptionOrTile(this.periodSelect, data.period);
    if (data.maturityInstruction) await this._selectOptionOrTile(this.maturitySelect, data.maturityInstruction);

    await expect(this.amountInput, "Amount field should contain the entered amount").toHaveValue(
      new RegExp(data.amount)
    );
  }

  async submit() {
    await expect(this.submitButton, "Submit button should be enabled once the FD form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { FixedDepositPage };
