const { expect } = require("@playwright/test");
const { selectOptionByLabelContains } = require("../utils/helpers");

/**
 * Bill Payment page (BillPaymentSection.tsx / BillPaymentForm.tsx).
 *
 * Flow: New Payment tab -> "All Categories" -> select a category tile
 *       (e.g. "Cable - TV") -> select a biller tile (e.g. "Dialog TV") ->
 *       fill the payment form (Pay From, Amount, Account No + Re Enter Account No)
 *       -> Next.
 *
 * The reference field and its "Re Enter" twin share the SAME placeholder
 * ("Account No"), so they are filled by order (first = enter, second = re-enter).
 * The form's submit control is the orange "Next" button.
 */
class BillPaymentPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.newPaymentTab = page.getByRole("button", { name: "New Payment", exact: true });
    this.allCategoriesHeading = page.getByText("All Categories", { exact: true });
    this.searchBillers = page.getByPlaceholder(/search billers/i);
    // Category tiles are 65px cards with a text label; biller tiles are 85px cards
    // holding the biller name plus a logo. Scoping to these keeps text matches off the
    // nav dropdown and off each other.
    this.categoryTiles = page.locator('div[class*="w-[65px]"]');
    this.billerTiles = page.locator('div[class*="w-[85px]"]');
    // The biller's reference field and its "Re Enter" twin share a placeholder that
    // differs per biller (Dialog: "Your GSM Phone Number"), but their name attributes
    // are stable: fieldData.N for the value, fieldData2.N for the re-enter.
    this.referenceInput = page.locator('input[name^="fieldData."]').first();
    this.reEnterInput = page.locator('input[name^="fieldData2."]').first();
    this.paymentUsingRadios = page.locator('input[name="paymentUsing"]');
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.transferModeRadios = page.locator('input[name="transferMode"]');
    this.amountInput = page.locator('input[name="amount"]').or(page.getByPlaceholder(/enter amount/i)).first();
    // The form's submit control is "Next" (anchored so it never matches "New Payment").
    this.nextButton = page.getByRole("button", { name: /^(next|proceed to pay|proceed)$/i }).first();
    this.agreeCheckbox = page.locator("#agreeCheckbox");
  }

  /** ASSERTION: the Bill Payment "New Payment" page with All Categories is displayed. */
  async assertLoaded() {
    await expect(this.allCategoriesHeading, "'All Categories' section should be visible on Bill Payment").toBeVisible({
      timeout: 60_000,
    });
  }

  /**
   * Clicks a category tile (e.g. "Telephone", "Cable - TV").
   *
   * Scoped to the category tiles, because an unscoped getByText also matches hidden
   * items in the collapsed Quick Actions nav dropdown (e.g. "Mobile Cash" for /Mobile/).
   * The tiles render several seconds before their labels populate, hence the long wait.
   */
  async selectCategory(categoryName) {
    // Separate "the list never loaded" from "that category isn't there", otherwise a slow
    // backend looks like a bad category name.
    await expect(
      this.categoryTiles.first(),
      "The Bill Payment category tiles never rendered - the category list is served slowly and intermittently " +
        "fails to load. This is an environment/backend issue, not a locator problem."
    ).toBeVisible({ timeout: 90_000 });

    const tile = this.categoryTiles.filter({ hasText: categoryName }).first();
    await expect(tile, `Category "${categoryName}" should be visible under All Categories`).toBeVisible({
      timeout: 60_000,
    });
    await tile.click();
  }

  /**
   * Selects a biller (e.g. "Dialog Mobile", "Mobitel Pvt Ltd") after a category is opened.
   *
   * A biller tile is the name + logo card; the logo <img> carries no alt text, so the
   * tile is matched on its visible name. The biller list is slow to arrive (~25s).
   */
  async selectBiller(billerName) {
    const tile = this.billerTiles.filter({ hasText: billerName }).first();
    await expect(tile, `Biller "${billerName}" should be visible in the category`).toBeVisible({ timeout: 90_000 });
    await tile.click();

    // ASSERTION: the payment form loaded after choosing the biller.
    await expect(this.fromAccountSelect, "Bill payment form: From Account dropdown should be visible").toBeVisible({
      timeout: 60_000,
    });
  }

  /** Chooses pay-by-account (Account radio) and the From account. */
  async payByAccount(fromAccountPartial) {
    const byAccount = this.paymentUsingRadios.first();
    if ((await byAccount.count()) > 0 && !(await byAccount.isChecked().catch(() => false))) {
      await byAccount.check({ force: true }).catch(() => {});
    }
    await selectOptionByLabelContains(this.fromAccountSelect, fromAccountPartial);
  }

  /** Fills the biller's reference field and its "Re Enter" twin with the same value. */
  async fillReferenceField(fieldName, value) {
    await expect(this.referenceInput, `Reference field "${fieldName}" should be visible`).toBeVisible({
      timeout: 30_000,
    });
    await this.referenceInput.fill(value);

    if ((await this.reEnterInput.count()) > 0) {
      await this.reEnterInput.fill(value);
      // ASSERTION: both fields hold the same value.
      await expect(this.reEnterInput, "Re Enter field should match the reference value").toHaveValue(value);
    }
  }

  /**
   * Fills the reference field and its "Re Enter" twin with DIFFERENT values, to
   * exercise the "numbers must match" validation. Returns true if a second
   * (re-enter) field exists to mismatch; false if the biller has only one field.
   */
  async fillMismatchedReference(fieldName, value, reEnterValue) {
    await expect(this.referenceInput, `Reference field "${fieldName}" should be visible`).toBeVisible({
      timeout: 30_000,
    });
    await this.referenceInput.fill(value);
    if ((await this.reEnterInput.count()) > 0) {
      await this.reEnterInput.fill(reEnterValue);
      return true;
    }
    return false;
  }

  /** Amount may be fixed by the biller; fill it only when the input is editable. */
  async fillAmountIfEditable(amount) {
    if (await this.amountInput.isVisible().catch(() => false)) {
      if (await this.amountInput.isEditable().catch(() => false)) {
        await this.amountInput.fill(amount);
      }
    }
  }

  async ensureOneTimeTransaction() {
    const oneTime = this.transferModeRadios.first();
    if ((await oneTime.count()) > 0 && !(await oneTime.isChecked().catch(() => false))) {
      await oneTime.check({ force: true }).catch(() => {});
    }
  }

  /** Clicks "Next" to submit the payment form and move to the confirmation/OTP step. */
  async proceed() {
    await expect(this.nextButton, "Next button should be enabled once the form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.nextButton.click();
  }

  async agreeTermsIfPresent() {
    if (await this.agreeCheckbox.isVisible().catch(() => false)) {
      await this.agreeCheckbox.check({ force: true });
    }
  }
}

module.exports = { BillPaymentPage };