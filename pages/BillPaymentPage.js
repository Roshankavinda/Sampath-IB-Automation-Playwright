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
   * Clicks a category tile (e.g. "Cable - TV"). Match is tolerant of spacing and
   * hyphen differences, so "Cable - TV", "Cable-TV" and "Cable TV" all work.
   */
  async selectCategory(categoryName) {
    const pattern = new RegExp(categoryName.trim().replace(/[\s-]+/g, "\\s*-?\\s*"), "i");
    const tile = this.page.getByText(pattern).first();
    await expect(tile, `Category "${categoryName}" should be visible under All Categories`).toBeVisible({
      timeout: 60_000,
    });
    await tile.click();
  }

  /**
   * Selects a biller (e.g. "Dialog TV") after a category is opened.
   * Uses the "Search Billers" box to narrow the list, then clicks the tile,
   * then asserts the payment form has loaded.
   */
  async selectBiller(billerName) {
    // if (await this.searchBillers.isVisible().catch(() => false)) {
    //   await this.searchBillers.fill(billerName);
    // } 

    const tile = this.page.getByText(billerName, { exact: false }).first();
    await expect(tile, `Biller "${billerName}" should be visible in the category`).toBeVisible({ timeout: 60_000 });
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

  /**
   * Fills the reference field and its "Re Enter" twin. Both fields share the same
   * placeholder (e.g. "Account No"), so they are filled by order:
   * first = Account No, second = Re Enter Account No.
   */
  async fillReferenceField(fieldName, value) {
    const inputs = this.page.getByPlaceholder(fieldName, { exact: false });
    await expect(inputs.first(), `Reference field "${fieldName}" should be visible`).toBeVisible({ timeout: 20_000 });
    await inputs.first().fill(value);

    // Re Enter field (same placeholder) - fill it if present.
    if ((await inputs.count()) > 1) {
      await inputs.nth(1).fill(value);
      // ASSERTION: both fields hold the same value.
      await expect(inputs.nth(1), "Re Enter field should match the reference value").toHaveValue(value);
    }
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