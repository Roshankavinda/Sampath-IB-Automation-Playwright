const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const { selectOptionByLabelContains, assertDropdownPopulated, assertSelectedContains } = require("../utils/helpers");

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
    // The "Saved Billers" sub-tab - clicking it re-fetches the (intermittently slow) list.
    this.savedBillersTab = page.getByRole("button", { name: "Saved Billers", exact: true }).first();

    // Saved billers render as TABLE rows with an "Add to List" checkbox; ticking one reveals a
    // "Pay Now" action that opens the payment form (the same pattern as the Saved Payees table).
    this.payNowButton = page.getByRole("button", { name: /pay now|make payment|^pay$|proceed/i }).first();

    // Payment form shown after a saved biller is picked (same form as regular Bill Payment).
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.amountInput = page.locator('input[name="amount"]').or(page.getByPlaceholder(/enter amount/i)).first();
    // The biller's reference field ("Mobitel Phone Number") is PRE-FILLED from the template;
    // its "Re-enter ..." twin is empty and required.
    this.referenceInput = page.locator('input[name^="fieldData."]').first();
    this.reEnterInput = page.getByPlaceholder(/re-?enter/i).first();
    // The submit control is "Pay now LKR <amount>" (NOT "Next"). Use .last() so we get the
    // form's button, not the list's bare "Pay now" that opened it.
    this.nextButton = page.getByRole("button", { name: /pay now\s+(lkr|usd)|proceed to pay|^(next|proceed|submit)$/i }).last();
  }

  /** ASSERTION: the Saved Billers page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Saved Billers' heading should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await expect(this.addNewBillerButton, "'Add New Biller' button should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
  }

  /**
   * Picks a saved biller by its template name and starts its payment.
   *
   * Confirmed from the live table (columns: Add to List | S.No | Template Name | Biller Name |
   * Amount | Field Value | Favourites | Actions): each saved biller is a ROW with an
   * "Add to List" checkbox. Tick it, then click "Pay Now" - the same mechanism the Saved
   * Payees flow uses. (The row's Actions icons are deliberately NOT clicked - one may delete.)
   *
   * The list is fetched intermittently, so this retries by re-opening the Saved Billers tab.
   */
  async selectSavedBiller(billerName) {
    const row = this.page.getByRole("row", { name: new RegExp(billerName, "i") }).first();

    let found = false;
    for (let attempt = 0; attempt < 3 && !found; attempt++) {
      found = await row
        .waitFor({ state: "visible", timeout: TIMEOUTS.LOAD })
        .then(() => true)
        .catch(() => false);
      if (found || (await this.emptyState.isVisible().catch(() => false))) break;
      // Re-fetch the (slow/intermittent) list.
      await this.savedBillersTab.click().catch(() => {});
      await this.page.waitForTimeout(1500);
    }

    if (!found) {
      const rows = (await this.page.getByRole("row").allInnerTexts().catch(() => []))
        .slice(1)
        .map((t) => t.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      throw new Error(
        `No saved biller matching "${billerName}" is listed. ` +
          (rows.length
            ? `Saved billers currently on the page: ${rows.join(" / ")}. ` +
              "Set savedBillerPayment.biller (test-data) to one of these template names."
            : "The account has no saved billers at all - add one first via Add New Biller.")
      );
    }

    // Tick the biller's "Add to List" checkbox, then Pay Now.
    await row.locator('input[type="checkbox"]').check().catch(() => {});
    await expect(this.payNowButton, "'Pay Now' should appear once a saved biller is selected").toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
    await this.payNowButton.click();

    // ASSERTION: the payment form opened for that biller.
    await expect(
      this.fromAccountSelect,
      "The payment form (Pay From account) should open after 'Pay Now'"
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /**
   * SOFT VALIDATIONS on the payment form (after a saved biller is chosen): the Pay From
   * account dropdown is populated and the amount + submit controls are present. Soft, so
   * all UI problems report together.
   */
  async assertPaymentFormValidations() {
    await assertDropdownPopulated(this.fromAccountSelect, "Pay From account");
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
    await expect.soft(this.nextButton, "Next button should be visible").toBeVisible();
  }

  /** Fills the funding account, amount, and the required "Re-enter reference" field. */
  async fillPayment(data) {
    if (data.fromAccount) {
      await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount).catch(() => {});
      // SOFT ASSERTION: the chosen Pay From account is the one selected.
      await assertSelectedContains(this.fromAccountSelect, data.fromAccount, "Pay From account");
    }
    // A saved biller may carry a fixed amount, so only type when the field is editable.
    if (data.amount && (await this.amountInput.isEditable().catch(() => false))) {
      await this.amountInput.fill(data.amount);
    }
    // The biller's reference is pre-filled from the template, but its "Re-enter ..." twin is
    // empty and REQUIRED - copy the reference value in so the form becomes valid.
    if (await this.reEnterInput.isVisible().catch(() => false)) {
      const ref = data.referenceValue || (await this.referenceInput.inputValue().catch(() => "")) || "";
      if (ref) await this.reEnterInput.fill(ref);
    }
  }

  async submit() {
    await expect(this.nextButton, "Next should be enabled once the payment form is valid").toBeEnabled({
      timeout: TIMEOUTS.ACTION,
    });
    await this.nextButton.click();
  }
}

module.exports = { SavedBillerPaymentPage };
