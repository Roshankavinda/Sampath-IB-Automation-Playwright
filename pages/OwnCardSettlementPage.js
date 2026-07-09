const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Send Money > Own Cards — settle your OWN Sampath credit card.
 * Flow: pick funding account -> pick your card -> choose settlement type
 *       (Minimum / Total Outstanding / Other Amount) -> amount (for Other Amount)
 *       -> Submit -> OTP/confirmation.
 *
 * // VERIFY against the live app: heading, tab label and field name attributes.
 * // Settlement type may be a <select> or radio tiles; the helper tolerates both.
 */
class OwnCardSettlementPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.fromAccountSelect = page.locator('select[name="accountFrom"], select[name="fundingAccount"]').first();
    this.cardSelect = page.locator('select[name="card"], select[name="cardNumber"], select[name="ownCard"]').first();
    this.settlementTypeSelect = page
      .locator('select[name="settlementType"], select[name="paymentOption"]')
      .first();
    this.settlementTypeRadios = page.locator('input[name="settlementType"], input[name="paymentOption"]');
    this.amountInput = page.locator('input[name="amount"]').first();
    this.remarkInput = page.locator('input[name="remark"], input[name="beneficiaryRemark"]').first();
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: /^(submit|pay|proceed|next|confirm)$/i }).first();
  }

  /** ASSERTION: the Own Card Settlement form is displayed. */
  async assertLoaded() {
    await expect(this.fromAccountSelect, "Own Card Settlement: funding account dropdown should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.cardSelect, "Own Card Settlement: card dropdown should be visible").toBeVisible();
  }

  /** Chooses a settlement type from either a <select> or a set of radio tiles. */
  async _selectSettlementType(label) {
    if (!label) return;
    if (await this.settlementTypeSelect.isVisible().catch(() => false)) {
      await selectOptionByLabelContains(this.settlementTypeSelect, label);
      return;
    }
    const tile = this.page.getByText(new RegExp(label, "i")).first();
    if (await tile.isVisible().catch(() => false)) await tile.click();
  }

  async fillForm(data) {
    await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount);
    await selectOptionByLabelContains(this.cardSelect, data.card);
    await this._selectSettlementType(data.settlementType);

    // Amount is only editable when settling an "Other Amount".
    if (data.amount && (await this.amountInput.isVisible().catch(() => false))) {
      if (await this.amountInput.isEditable().catch(() => false)) {
        await this.amountInput.fill(data.amount);
        await expect(this.amountInput, "Amount field should contain the entered amount").toHaveValue(
          new RegExp(data.amount)
        );
      }
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

module.exports = { OwnCardSettlementPage };
