const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
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

    // ---- Favourites ----
    // Each row has an "Add to Favorites" cell (a star control). Favourited payees appear in
    // the right-hand "Your favourite list" panel.
    this.favouritesPanel = page.getByText(/your favourite list/i).first();
    this.favouritesSearch = page.getByPlaceholder(/search favourite payees/i);
    this.noFavouritesState = page.getByText(/no favou?rite payees? found/i);
  }

  /**
   * The row's "Add to Favorites" control (star). The Saved Payees table columns are:
   * Add to List | Account Number | Account Name | Nickname | Bank Name | Transaction Type |
   * Add to Favorites | Actions - so the star lives in cell index 6.
   */
  favouriteControl(row) {
    const byName = row.getByRole("button", { name: /favou?rite|star/i }).first();
    return byName.or(row.getByRole("cell").nth(6).locator("button, img, svg").first());
  }

  /** The favourites panel entry for a payee (it renders outside the table). */
  favouriteEntry(payeeName) {
    return this.favouritesPanel
      .locator("xpath=ancestor::*[3]")
      .getByText(new RegExp(payeeName, "i"))
      .first();
  }

  /**
   * Returns the saved-payee row for `payeeName`. The table intermittently renders empty, so
   * this retries by re-opening Saved Payees before giving up.
   */
  async findRow(payeeName) {
    const row = this.payeeRows.filter({ hasText: payeeName }).first();
    let found = false;
    for (let attempt = 0; attempt < 3 && !found; attempt++) {
      found = await row
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (found) break;
      // Re-fetch the list via the "Saved Payees" tab.
      await this.page.getByRole("button", { name: "Saved Payees", exact: true }).first().click().catch(() => {});
      await this.page.waitForTimeout(2000);
    }
    if (!found) {
      const listed = (await this.payeeRows.allInnerTexts().catch(() => []))
        .map((t) => t.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      throw new Error(
        `No saved payee matching "${payeeName}" is listed. ` +
          (listed.length ? `Saved payees on the page: ${listed.join(" / ")}.` : "The account has no saved payees at all.")
      );
    }
    return row;
  }

  /** ASSERTION: the favourites panel ("Your favourite list") is displayed. */
  async assertFavouritesPanelShown() {
    await expect(this.favouritesPanel, "The 'Your favourite list' panel should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** True if the payee is already in the favourites panel. */
  async isFavourite(payeeName) {
    return this.favouriteEntry(payeeName).isVisible().catch(() => false);
  }

  /** How many times the payee appears in the favourites panel (duplicate check). */
  async favouriteEntryCount(payeeName) {
    return this.favouritesPanel
      .locator("xpath=ancestor::*[3]")
      .getByText(new RegExp(payeeName, "i"))
      .count()
      .catch(() => 0);
  }

  // ---- Multiple (batch) transfers ----
  // Selecting N payees builds an indexed form: tranList.0.*, tranList.1.*, ...

  /** Amount field for the Nth payee block on the batch transfer form. */
  amountInputAt(index) {
    return this.page.locator(`input[name="tranList.${index}.amount"]`);
  }

  /** Purpose dropdown for the Nth payee block. */
  purposeSelectAt(index) {
    return this.page.locator(`select[name="tranList.${index}.purpose"]`);
  }

  /** Beneficiary-remark field for the Nth payee block. */
  beneficiaryRemarkAt(index) {
    return this.page.locator(`input[name="tranList.${index}.beneficiaryRemarks"]`);
  }

  /** The nicknames currently listed, in table order (Nickname is the 4th column). */
  async listedPayeeNames() {
    const n = await this.payeeRows.count().catch(() => 0);
    const names = [];
    for (let i = 0; i < n; i++) {
      const name = await this.payeeRows.nth(i).getByRole("cell").nth(3).innerText().catch(() => "");
      if (name.trim()) names.push(name.trim());
    }
    return names;
  }

  /**
   * Ticks the "Add to List." checkbox of SEVERAL saved payees, then clicks "Pay Now" once to
   * transfer to them together. Each selected payee becomes its own tranList block.
   * @param {string[]} payeeNames nicknames to include in the batch
   */
  async selectMultipleSavedPayees(payeeNames) {
    for (const name of payeeNames) {
      const row = await this.findRow(name);
      await row.locator('input[type="checkbox"]').check().catch(() => {});
      await expect(
        row.locator('input[type="checkbox"]'),
        `"${name}" should be ticked for the batch transfer`
      ).toBeChecked({ timeout: TIMEOUTS.UI });
    }

    await expect(this.payNowButton, "'Pay Now' should appear once payees are selected").toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
    await this.payNowButton.click();

    // ASSERTION: the batch transfer form opened (the first payee's amount block).
    await expect(this.amountInputAt(0), "The batch transfer form should open after 'Pay Now'").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /**
   * ASSERTION: the form shows one amount block per selected payee (tranList.0 .. tranList.N-1).
   */
  async assertBatchFormShows(payeeNames) {
    for (let i = 0; i < payeeNames.length; i++) {
      await expect(
        this.amountInputAt(i),
        `The batch form should include an amount block for "${payeeNames[i]}" (tranList.${i})`
      ).toBeVisible({ timeout: TIMEOUTS.LOAD });
    }
  }

  /**
   * Fills the funding account once, then the amount / purpose / remark of EVERY payee block.
   * @param {{ fromAccount?: string, amount?: string, purpose?: string, beneficiaryRemark?: string }} data
   * @param {number} count how many payee blocks to fill
   */
  async fillBatchTransfer(data, count) {
    if (data.fromAccount) {
      await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount).catch(() => {});
      await assertSelectedContains(this.fromAccountSelect, data.fromAccount, "From Account");
    }

    for (let i = 0; i < count; i++) {
      if (data.amount != null) await this.amountInputAt(i).fill(String(data.amount)).catch(() => {});
      if (data.purpose && (await this.purposeSelectAt(i).isVisible().catch(() => false))) {
        await selectOptionByLabelContains(this.purposeSelectAt(i), data.purpose).catch(() => {});
      }
      if (data.beneficiaryRemark && (await this.beneficiaryRemarkAt(i).isVisible().catch(() => false))) {
        await this.beneficiaryRemarkAt(i).fill(data.beneficiaryRemark).catch(() => {});
      }
    }
  }

  /**
   * Removes a payee from favourites by clicking its star again (the control toggles).
   * Safe + reversible: the positive favourites test re-adds it.
   */
  async removeFromFavourites(row, name) {
    const star = this.favouriteControl(row);
    await expect(star, `The favourites control should be available for "${name}"`).toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await star.click({ force: true });
    await this.page.waitForTimeout(2000);
  }

  /** Types into the favourites search box to filter the favourites panel. */
  async searchFavourites(text) {
    await expect(this.favouritesSearch, "The favourites search box should be visible").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await this.favouritesSearch.fill(text);
    await this.page.waitForTimeout(1500); // let the panel filter
  }

  /** Clicks the row's "Add to Favorites" star. */
  async addToFavourites(row, payeeName) {
    const star = this.favouriteControl(row);
    await expect(star, `The "Add to Favorites" control should be available for "${payeeName}"`).toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await star.click({ force: true });
  }

  /** ASSERTION: the payee now appears in the "Your favourite list" panel. */
  async assertAddedToFavourites(payeeName) {
    await expect(
      this.favouriteEntry(payeeName),
      `"${payeeName}" should appear in the favourites list after being added`
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  /** ASSERTION: the Saved Payees page is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'Saved Payees' heading should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await expect(this.filtersPrompt, "The Saved Payees filter prompt should be visible").toBeVisible();
    await expect(this.addNewPayeeButton, "'Add New Payee' button should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
  }

  /**
   * Ticks the saved payee's "Add to List." checkbox and opens its transfer form via
   * "Pay Now". Fails with an actionable message when the payee is not in the list.
   */
  async selectSavedPayee(payeeName) {
    const row = this.payeeRows.filter({ hasText: payeeName }).first();

    const found = await row
      .waitFor({ state: "visible", timeout: TIMEOUTS.SLOW_LOAD })
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
      timeout: TIMEOUTS.ACTION,
    });
    await this.payNowButton.click();

    // ASSERTION: the transfer form opened for that payee.
    await expect(this.amountInput, "The transfer form (Amount) should open after 'Pay Now'").toBeVisible({
      timeout: TIMEOUTS.LOAD,
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
        timeout: TIMEOUTS.UI,
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
      .toBeEnabled({ timeout: TIMEOUTS.ACTION });
    await this.submitButton.click();
  }
}

module.exports = { SavedPayeeTransferPage };
