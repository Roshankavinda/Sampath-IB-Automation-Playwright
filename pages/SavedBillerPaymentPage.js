const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Bill Payment by a SAVED BILLER.
 * Payees & Billers > Saved Billers -> pick a saved biller -> the payment form opens
 * pre-filled with that biller and its reference -> Pay From / Amount -> Next -> OTP.
 *
 * Confirmed: the Saved Billers page (on /dashboard/billpayment), its "Add New Biller"
 * button, and its empty state "No saved billers found".
 *
 * // VERIFY: the saved-biller row/tile and the payment form that opens after picking one
 * // could NOT be captured, because this account has NO saved billers (and Add New Biller
 * // is rejected by the backend). The form fields below reuse the names proven on the
 * // Bill Payment form; confirm them once a biller exists.
 *
 * Note: "Old Vishwa Saved Billers" cannot be used here - the app states they are "for
 * reference only. Please save them again in New Vishwa to use for bill payments."
 */
class SavedBillerPaymentPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Saved Billers landing ("Saved Billers" also exists as a hidden nav item - match visible).
    this.heading = page.getByText("Saved Billers", { exact: true }).locator("visible=true").first();
    this.addNewBillerButton = page.getByRole("button", { name: "Add New Biller", exact: true });
    this.emptyState = page.getByText(/no saved billers found/i);

    // Payment form shown after a saved biller is picked. // VERIFY
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.amountInput = page.locator('input[name="amount"]').or(page.getByPlaceholder(/enter amount/i)).first();
    this.nextButton = page.getByRole("button", { name: /^(next|pay|proceed|submit)$/i }).first();
  }

  /** ASSERTION: the Saved Billers page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Saved Billers' heading should be visible").toBeVisible({ timeout: 60_000 });
    await expect(this.addNewBillerButton, "'Add New Biller' button should be visible").toBeVisible({ timeout: 60_000 });
  }

  /**
   * Picks a saved biller by its template name.
   * Fails with an actionable message when the account has no saved billers at all.
   */
  async selectSavedBiller(billerName) {
    const biller = this.page
      .getByText(new RegExp(billerName, "i"))
      .locator("visible=true")
      .first();

    // The list loads slowly, so race the biller against the app's own empty state rather
    // than checking the empty state up front (it has not rendered yet at that point).
    const outcome = await Promise.race([
      biller.waitFor({ state: "visible", timeout: 30_000 }).then(() => "found").catch(() => null),
      this.emptyState.waitFor({ state: "visible", timeout: 30_000 }).then(() => "empty").catch(() => null),
    ]);

    if (outcome !== "found") {
      throw new Error(
        `Cannot pay by saved biller: no biller matching "${billerName}" is listed` +
          (outcome === "empty" ? ' and the page shows "No saved billers found"' : "") +
          ". This account has NO saved billers. Add one first - note that Add New Biller is itself rejected by the " +
          'backend right now (HTTP 500 "Internal server error"), so this flow is blocked until a biller can be saved. ' +
          "Old Vishwa saved billers cannot be used: the app says they are for reference only and must be re-saved in " +
          "New Vishwa."
      );
    }
    await biller.click();

    // ASSERTION: the payment form opened for that biller.
    await expect(
      this.fromAccountSelect,
      "The payment form (Pay From account) should open after picking a saved biller"
    ).toBeVisible({ timeout: 30_000 });
  }

  /** Fills the funding account and amount; the biller + reference come from the template. */
  async fillPayment(data) {
    if (data.fromAccount) {
      await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount).catch(() => {});
    }
    // A saved biller may carry a fixed amount, so only type when the field is editable.
    if (data.amount && (await this.amountInput.isEditable().catch(() => false))) {
      await this.amountInput.fill(data.amount);
    }
  }

  async submit() {
    await expect(this.nextButton, "Next should be enabled once the payment form is valid").toBeEnabled({
      timeout: 20_000,
    });
    await this.nextButton.click();
  }
}

module.exports = { SavedBillerPaymentPage };
