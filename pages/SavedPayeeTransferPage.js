const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Fund Transfer by a SAVED PAYEE.
 * Payees & Billers > Saved Payees -> pick a saved payee -> the transfer form opens
 * pre-filled with that beneficiary -> amount / remarks -> Submit -> OTP.
 *
 * Confirmed: the Saved Payees page (on /dashboard/sendmoney) with its filters
 * (All | Sampath Bank Accounts | Other Bank Accounts | Other Bank Cards) and the
 * "Add New Payee" button.
 *
 * // VERIFY: the payee row/tile and the transfer form that opens after picking one could
 * // NOT be captured, because this account currently has NO saved payees (and Add New
 * // Payee is rejected by the backend). The form fields below reuse the names proven on
 * // the other transfer forms; confirm them once a payee exists.
 */
class SavedPayeeTransferPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Saved Payees landing ("Saved Payees" also exists as a hidden nav item - match visible).
    this.heading = page.getByText("Saved Payees", { exact: true }).locator("visible=true").first();
    this.filtersPrompt = page.getByText(/Use filters to fetch different account types/i);
    this.addNewPayeeButton = page.getByRole("button", { name: "Add New Payee", exact: true });
    this.allFilter = page.getByText("All", { exact: true }).locator("visible=true").first();

    // Transfer form shown after a payee is picked. // VERIFY
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.amountInput = page.locator('input[name="amount"]');
    this.senderRemarkInput = page.locator('input[name="senderRemark"]');
    this.beneficiaryRemarkInput = page.locator('input[name="beneficiaryRemark"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.submitButton = page.getByRole("button", { name: /^(submit|next)$/i }).first();
  }

  /** ASSERTION: the Saved Payees page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Saved Payees' heading should be visible").toBeVisible({ timeout: 60_000 });
    await expect(this.filtersPrompt, "The Saved Payees filter prompt should be visible").toBeVisible();
    await expect(this.addNewPayeeButton, "'Add New Payee' button should be visible").toBeVisible({ timeout: 60_000 });
  }

  /**
   * Picks a saved payee by its nickname/name.
   * Fails with an actionable message when the account has no saved payees at all.
   */
  async selectSavedPayee(payeeName) {
    // Show every payee type before searching.
    if (await this.allFilter.isVisible().catch(() => false)) await this.allFilter.click().catch(() => {});

    const payee = this.page
      .getByText(new RegExp(payeeName, "i"))
      .locator("visible=true")
      .first();

    const found = await payee
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);

    if (!found) {
      throw new Error(
        `No saved payee matching "${payeeName}" is listed on the Saved Payees page. This account currently has NO ` +
          "saved payees, so a transfer by saved payee cannot run. Add one first - note that Add New Payee is itself " +
          'rejected by the backend right now (HTTP 500 "Session TimeOut"), so this flow is blocked until a payee ' +
          "can be saved."
      );
    }
    await payee.click();

    // ASSERTION: the transfer form opened for that payee.
    await expect(
      this.amountInput,
      "The transfer form (Amount field) should open after picking a saved payee"
    ).toBeVisible({ timeout: 30_000 });
  }

  /** Fills the amount and remarks; the beneficiary comes from the saved payee. */
  async fillTransfer(data) {
    if (data.fromAccount && (await this.fromAccountSelect.isVisible().catch(() => false))) {
      await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount).catch(() => {});
    }
    await this.amountInput.fill(data.amount);
    if (data.senderRemark && (await this.senderRemarkInput.isVisible().catch(() => false))) {
      await this.senderRemarkInput.fill(data.senderRemark);
    }
    if (data.beneficiaryRemark && (await this.beneficiaryRemarkInput.isVisible().catch(() => false))) {
      await this.beneficiaryRemarkInput.fill(data.beneficiaryRemark);
    }

    // ASSERTION: the amount is reflected in the form.
    await expect(this.amountInput, "Amount field should contain the entered amount").toHaveValue(
      new RegExp(data.amount)
    );
  }

  /** Selects the One-time transfer mode when the form offers it. */
  async ensureOneTimeTransaction() {
    const oneTime = this.transferModeRadios.first();
    if ((await oneTime.count()) > 0 && !(await oneTime.isChecked().catch(() => false))) {
      await oneTime.check({ force: true }).catch(() => {});
    }
  }

  async submit() {
    await expect(this.submitButton, "Submit should be enabled once the transfer form is valid").toBeEnabled({
      timeout: 20_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { SavedPayeeTransferPage };
