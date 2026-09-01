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

    // ---- Saved Payees list: filters, search, pagination ----
    // Confirmed columns: Add to List. | Account Number | Account Name | Nickname | Bank Name |
    // Transaction Type | Add to Favorites | Actions
    this.filterAll = page.getByText("All", { exact: true }).locator("visible=true").first();
    this.filterSampath = page.getByText("Sampath Bank Accounts", { exact: true }).locator("visible=true").first();
    this.filterOtherBank = page.getByText("Other Bank Accounts", { exact: true }).locator("visible=true").first();
    this.filterOtherCards = page.getByText("Other Bank Cards", { exact: true }).locator("visible=true").first();

    this.searchBox = page.getByRole("textbox", { name: /^search$/i }).first();
    this.perPageSelect = page.getByRole("combobox", { name: /payees per page/i }).first();
    this.emptyState = page.getByText(/no .*(payees?|data|records|found)/i).locator("visible=true").first();

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

  // ---- Saved Payees list helpers ----

  /** The filter tab locator for a category name. */
  filterTab(name) {
    if (/sampath/i.test(name)) return this.filterSampath;
    if (/card/i.test(name)) return this.filterOtherCards;
    if (/other/i.test(name)) return this.filterOtherBank;
    return this.filterAll;
  }

  /** SOFT ASSERTIONS: the Saved Payees table shows all its columns. */
  async assertTableColumns() {
    for (const header of [
      "Account Number",
      "Account Name",
      "Nickname",
      "Bank Name",
      "Transaction Type",
      "Add to Favorites",
      "Actions",
    ]) {
      await expect
        .soft(this.page.getByRole("columnheader", { name: new RegExp(header, "i") }).first(), `Column "${header}"`)
        .toBeVisible();
    }
  }

  /** SOFT ASSERTIONS: all four account-type filters are offered. */
  async assertFiltersOffered() {
    await expect.soft(this.filterAll, "'All' filter should be offered").toBeVisible();
    await expect.soft(this.filterSampath, "'Sampath Bank Accounts' filter should be offered").toBeVisible();
    await expect.soft(this.filterOtherBank, "'Other Bank Accounts' filter should be offered").toBeVisible();
    await expect.soft(this.filterOtherCards, "'Other Bank Cards' filter should be offered").toBeVisible();
  }

  /**
   * Waits for the payee table to finish (re)loading. While it loads, the "Payees per page"
   * selector is DISABLED - that is the app's own loading signal, so it is a far more reliable
   * gate than a fixed sleep.
   */
  async waitForListReady() {
    for (let i = 0; i < 20; i++) {
      const busy = await this.perPageSelect.isDisabled().catch(() => true);
      if (!busy) break;
      await this.page.waitForTimeout(1000);
    }
    await this.page.waitForTimeout(800);
  }

  /** Applies an account-type filter and waits for the table to refresh. */
  async applyFilter(name) {
    const tab = this.filterTab(name);
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click({ force: true });
    await this.waitForListReady();
    return true;
  }

  /** How many payee rows are currently listed. */
  async rowCount() {
    return this.payeeRows.count().catch(() => 0);
  }

  /**
   * ASSERTION: the list shows rows or an explicit empty state (never a blank panel).
   * Returns the row count.
   */
  async assertListRendered(label) {
    // Poll: the table re-renders asynchronously after a filter/search, and the app does not
    // always toggle its loading flag, so a single read can land on the empty in-between state.
    let rows = 0;
    let empty = false;
    for (let i = 0; i < 15; i++) {
      rows = await this.rowCount();
      empty = await this.emptyState.isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    expect(rows > 0 || empty, `"${label}" should show payee rows or an explicit empty state`).toBeTruthy();
    return rows;
  }

  /** Types into the Saved Payees search box and lets the table filter. */
  async search(text) {
    await expect(this.searchBox, "The Saved Payees search box should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.searchBox.fill(text);
    await this.waitForListReady();
  }

  /** Clears the search box. */
  async clearSearch() {
    await this.searchBox.fill("").catch(() => {});
    await this.waitForListReady();
  }

  /** The page-size options offered by the "Payees per page" selector. */
  async perPageOptions() {
    return this.perPageSelect
      .locator("option")
      .allInnerTexts()
      .then((v) => v.map((t) => t.trim()).filter(Boolean))
      .catch(() => []);
  }

  /** Sets the page size and lets the table re-render. */
  async setPerPage(size) {
    await expect(this.perPageSelect, "The 'Payees per page' selector should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.perPageSelect.selectOption(String(size)).catch(() => {});
    await this.waitForListReady();
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

  // ---- Row actions: edit (pencil) and delete (bin) ----
  // The Saved Payees table's last column is "Actions", holding a pencil (edit) and a bin
  // (delete). // VERIFY: the icons carry no confirmed accessible name, so they are matched
  // by role and alt/title text first, then by their position inside the Actions cell.

  /** The row's Actions cell (the last cell of the row). */
  actionsCell(row) {
    return row.getByRole("cell").last();
  }

  /** The row's edit (pencil) control. */
  editControl(row) {
    const byName = row.getByRole("button", { name: /edit|pencil|modify|update/i }).first();
    const byAlt = row.getByRole("img", { name: /edit|pencil/i }).first();
    return byName.or(byAlt).or(this.actionsCell(row).locator("button, img, svg").first());
  }

  /** The row's delete (bin) control. */
  deleteControl(row) {
    const byName = row.getByRole("button", { name: /delete|remove|bin|trash/i }).first();
    const byAlt = row.getByRole("img", { name: /delete|bin|trash/i }).first();
    return byName.or(byAlt).or(this.actionsCell(row).locator("button, img, svg").last());
  }

  /** Opens the edit form for a payee row. Returns false when no edit control is offered. */
  async openEdit(row) {
    const pencil = this.editControl(row);
    if (!(await pencil.isVisible().catch(() => false))) return false;
    await pencil.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);
    return true;
  }

  /**
   * ASSERTION: the edit form opened pre-filled with the payee's saved values (it reuses the
   * "Add New Payee" modal). Returns the values so a caller can compare after cancelling.
   */
  async assertEditFormPrefilled() {
    const nickName = this.page.locator('input[name="nickName"]');
    await expect(nickName, "The edit form should show the payee's Nickname").toBeVisible({ timeout: TIMEOUTS.LOAD });
    const values = {
      nickName: await nickName.inputValue().catch(() => ""),
      accountName: await this.page.locator('input[name="accountName"]').inputValue().catch(() => ""),
      accountNumber: await this.page.locator('input[name="toAccountNumber"]').inputValue().catch(() => ""),
    };
    expect(values.nickName.trim(), "The edit form should be pre-filled with the saved nickname").not.toBe("");
    return values;
  }

  /** Closes the edit form without saving. */
  async cancelEdit() {
    const cancel = this.page
      .getByRole("button", { name: /^(cancel|back|close|dismiss)$/i })
      .locator("visible=true")
      .last();
    if (await cancel.isVisible().catch(() => false)) await cancel.click({ force: true }).catch(() => {});
    else await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  /** Opens the delete confirmation for a payee row. Returns false when no bin is offered. */
  async openDelete(row) {
    const bin = this.deleteControl(row);
    if (!(await bin.isVisible().catch(() => false))) return false;
    await bin.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);
    return true;
  }

  /** ASSERTION: deleting asks for confirmation before it removes anything. */
  async assertDeleteConfirmationShown() {
    const prompt = await this.page
      .getByText(/are you sure|do you want to (delete|remove)|delete .*payee|remove .*payee/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    const confirmBtn = await this.page
      .getByRole("button", { name: /^(confirm|yes|delete|ok|remove)$/i })
      .locator("visible=true")
      .last()
      .isVisible()
      .catch(() => false);
    expect(
      prompt || confirmBtn,
      "Deleting a saved payee must raise a confirmation before the payee is removed"
    ).toBeTruthy();
  }

  /** Cancels the delete confirmation - nothing is removed. */
  async cancelDelete() {
    const cancel = this.page
      .getByRole("button", { name: /^(cancel|no|back|close|dismiss)$/i })
      .locator("visible=true")
      .last();
    if (await cancel.isVisible().catch(() => false)) await cancel.click({ force: true }).catch(() => {});
    else await this.page.keyboard.press("Escape").catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  /** !! DESTRUCTIVE !! Confirms the delete - the payee is really removed. */
  async confirmDelete() {
    const confirm = this.page
      .getByRole("button", { name: /^(confirm|yes|delete|ok|remove)$/i })
      .locator("visible=true")
      .last();
    await expect(confirm, "The delete confirmation should offer a confirm action").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await confirm.click({ force: true });
    await this.page.waitForTimeout(3000);
  }
}

module.exports = { SavedPayeeTransferPage };
