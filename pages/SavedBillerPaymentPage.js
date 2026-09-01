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

    // ---- Favourites ----
    // Each row has an "Add to Favourites" cell (a star control). Favourited billers appear in
    // the right-hand "Your favourite list" panel with a "FAVORITES" badge.
    this.favouritesPanel = page.getByText(/your favourite list/i).first();
    this.favouritesSearch = page.getByPlaceholder(/search favourite billers/i);
    this.noFavouritesState = page.getByText(/no favou?rite billers? found/i);

    // Payment form shown after a saved biller is picked (same form as regular Bill Payment).
    this.fromAccountSelect = page.locator('select[name="accountFrom"]');
    this.amountInput = page.locator('input[name="amount"]').or(page.getByPlaceholder(/enter amount/i)).first();
    // The biller's reference field ("Mobitel Phone Number") is PRE-FILLED from the template;
    // its "Re-enter ..." twin is empty and required.
    this.referenceInput = page.locator('input[name^="fieldData."]').first();
    this.reEnterInput = page.getByPlaceholder(/re-?enter/i).first();
    // The submit control is "Pay now LKR <amount>" (NOT "Next"). Use .last() so we get the
    // form's button, not the list's bare "Pay now" that opened it.
    this.nextButton = page
      .getByRole("button", { name: /pay now\s+(lkr|usd)|proceed to pay|^(next|proceed|submit)$/i })
      .last();

    // ---- List chrome: tabs, rows, search, page size ----
    // The Bill Payment area's tabs. The same labels also exist as hidden nav-dropdown
    // items, so tabs are matched by role (buttons) and only when visible.
    this.newPaymentTab = page.getByRole("button", { name: "New Payment", exact: true });
    this.billPaymentHistoryTab = page.getByRole("button", { name: /bill payment history/i }).first();
    this.governmentPaymentHistoryTab = page.getByRole("button", { name: /government payment history/i }).first();
    this.billerRows = page.locator("table tbody tr");
    this.searchBox = page.getByRole("textbox", { name: /^search$/i }).first();
    this.perPageSelect = page.getByRole("combobox", { name: /billers per page|per page/i }).first();

    // ---- Row actions (Actions cell: pencil = edit, bin = delete) ----
    // // VERIFY: the icons carry no confirmed accessible name, so they are matched by role
    // and alt/title text first, then by their position inside the Actions cell.
    this.editModalHeading = page
      .getByText(/edit biller|update biller|edit template|add biller/i)
      .locator("visible=true")
      .first();
    this.deletePrompt = page
      .getByText(/are you sure|do you want to (delete|remove)|delete .*biller|remove .*biller/i)
      .locator("visible=true")
      .first();
    this.confirmDeleteButton = page
      .getByRole("button", { name: /^(confirm|yes|delete|ok|remove)$/i })
      .locator("visible=true")
      .last();
    this.cancelDeleteButton = page
      .getByRole("button", { name: /^(cancel|no|back|close|dismiss)$/i })
      .locator("visible=true")
      .last();
  }

  // ---- Saved Billers list helpers (mirror of the Saved Payees list) ----

  /** SOFT ASSERTIONS: the Saved Billers table shows all its columns. */
  async assertTableColumns() {
    for (const header of ["Template Name", "Biller Name", "Amount", "Field Value", "Actions"]) {
      await expect
        .soft(this.page.getByRole("columnheader", { name: new RegExp(header, "i") }).first(), `Column "${header}"`)
        .toBeVisible();
    }
  }

  /** SOFT ASSERTIONS: the Bill Payment area offers all of its tabs. */
  async assertTabsOffered() {
    await expect.soft(this.savedBillersTab, "'Saved Billers' tab should be offered").toBeVisible();
    await expect.soft(this.newPaymentTab, "'New Payment' tab should be offered").toBeVisible();
    // The two history tabs are not present on every build/profile - assert them softly.
    for (const [tab, label] of [
      [this.billPaymentHistoryTab, "Bill Payment History"],
      [this.governmentPaymentHistoryTab, "Government Payment History"],
    ]) {
      if (await tab.isVisible().catch(() => false)) {
        await expect.soft(tab, `'${label}' tab should be offered`).toBeVisible();
      }
    }
  }

  /** The tab locator for a tab name. */
  tab(name) {
    if (/new payment/i.test(name)) return this.newPaymentTab;
    if (/government/i.test(name)) return this.governmentPaymentHistoryTab;
    if (/history/i.test(name)) return this.billPaymentHistoryTab;
    return this.savedBillersTab;
  }

  /** Switches to a tab. Returns false when that tab is not offered. */
  async switchTab(name) {
    const tab = this.tab(name);
    if (!(await tab.isVisible().catch(() => false))) return false;
    await tab.click({ force: true }).catch(() => {});
    await this.waitForListReady();
    return true;
  }

  /**
   * Waits for the biller table to finish (re)loading. The saved-billers list is fetched
   * intermittently, so this polls for rows or the empty state rather than sleeping blind.
   */
  async waitForListReady() {
    for (let i = 0; i < 15; i++) {
      const rows = await this.rowCount();
      const empty = await this.emptyState.first().isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    await this.page.waitForTimeout(500);
  }

  /** How many biller rows are currently listed. */
  async rowCount() {
    return this.billerRows.count().catch(() => 0);
  }

  /**
   * ASSERTION: the list shows rows or an explicit empty state (never a blank panel).
   * Returns the row count.
   */
  async assertListRendered(label) {
    let rows = 0;
    let empty = false;
    for (let i = 0; i < 15; i++) {
      rows = await this.rowCount();
      empty = await this.emptyState.first().isVisible().catch(() => false);
      if (rows > 0 || empty) break;
      await this.page.waitForTimeout(1000);
    }
    expect(rows > 0 || empty, `"${label}" should show biller rows or an explicit empty state`).toBeTruthy();
    return rows;
  }

  /** ASSERTION: no loading error is shown on the list. */
  async assertNoError() {
    const error = await this.page
      .getByText(/error loading|failed to load|something went wrong/i)
      .locator("visible=true")
      .first()
      .isVisible()
      .catch(() => false);
    expect(error, "The Saved Billers list must not show a loading error").toBeFalsy();
  }

  /**
   * Searches the Saved Billers list.
   *
   * CONFIRMED against the live app: unlike the Saved Payees list (which filters as you
   * type), this search only runs when ENTER is pressed - typing alone leaves the previous
   * result on screen. So the term is typed AND submitted here.
   */
  async search(text) {
    if (!(await this.searchBox.isVisible().catch(() => false))) return false;
    await this.searchBox.fill(text);
    await this.searchBox.press("Enter");
    await this.waitForSearchApplied();
    return true;
  }

  /** Clears the search box and re-runs it, so the full list comes back. */
  async clearSearch() {
    await this.searchBox.fill("").catch(() => {});
    await this.searchBox.press("Enter").catch(() => {});
    await this.waitForSearchApplied();
  }

  /**
   * Waits for a search to be applied. A search can legitimately end with ZERO rows, so
   * (unlike waitForListReady) this must not keep polling for rows - it settles on the
   * table no longer changing.
   */
  async waitForSearchApplied() {
    let previous = -1;
    for (let i = 0; i < 10; i++) {
      await this.page.waitForTimeout(1000);
      const rows = await this.rowCount();
      if (rows === previous) return rows;
      previous = rows;
    }
    return previous;
  }

  /** The page-size options offered by the "per page" selector (empty when not offered). */
  async perPageOptions() {
    if (!(await this.perPageSelect.isVisible().catch(() => false))) return [];
    return this.perPageSelect
      .locator("option")
      .allInnerTexts()
      .then((v) => v.map((t) => t.trim()).filter(Boolean))
      .catch(() => []);
  }

  /** Sets the page size and lets the table re-render. */
  async setPerPage(size) {
    await this.perPageSelect.selectOption(String(size)).catch(() => {});
    await this.waitForListReady();
  }

  // ---- Row actions: edit (pencil) and delete (bin) ----

  /** The row's Actions cell (the last cell of the row). */
  actionsCell(row) {
    return row.getByRole("cell").last();
  }

  /** The row's edit (pencil) control. */
  editControl(row) {
    const byName = row.getByRole("button", { name: /edit|pencil|modify|update/i }).first();
    const byAlt = row.getByRole("img", { name: /edit|pencil/i }).first();
    // Fallback: the FIRST clickable icon in the Actions cell is the pencil.
    return byName.or(byAlt).or(this.actionsCell(row).locator("button, img, svg").first());
  }

  /** The row's delete (bin) control. */
  deleteControl(row) {
    const byName = row.getByRole("button", { name: /delete|remove|bin|trash/i }).first();
    const byAlt = row.getByRole("img", { name: /delete|bin|trash/i }).first();
    // Fallback: the LAST clickable icon in the Actions cell is the bin.
    return byName.or(byAlt).or(this.actionsCell(row).locator("button, img, svg").last());
  }

  /** Opens the edit form for a row. Returns false when no edit control is offered. */
  async openEdit(row) {
    const pencil = this.editControl(row);
    if (!(await pencil.isVisible().catch(() => false))) return false;
    await pencil.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);
    return true;
  }

  /**
   * ASSERTION: the edit form opened pre-filled with the biller's saved values.
   * Returns the values it found, so a caller can compare them after cancelling.
   */
  async assertEditFormPrefilled() {
    const templateNameInput = this.page.locator('input[name="templateName"]');
    await expect(templateNameInput, "The edit form should show the Template Name").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    const templateName = await templateNameInput.inputValue().catch(() => "");
    const amount = await this.page.locator('input[name="amount"]').first().inputValue().catch(() => "");
    expect(templateName.trim(), "The edit form should be pre-filled with the saved template name").not.toBe("");
    return { templateName, amount };
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

  /** Opens the delete confirmation for a row. Returns false when no bin is offered. */
  async openDelete(row) {
    const bin = this.deleteControl(row);
    if (!(await bin.isVisible().catch(() => false))) return false;
    await bin.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2500);
    return true;
  }

  /** ASSERTION: deleting asks for confirmation before it removes anything. */
  async assertDeleteConfirmationShown() {
    const prompt = await this.deletePrompt.isVisible().catch(() => false);
    const confirmBtn = await this.confirmDeleteButton.isVisible().catch(() => false);
    expect(
      prompt || confirmBtn,
      "Deleting a saved biller must raise a confirmation before the biller is removed"
    ).toBeTruthy();
  }

  /** Cancels the delete confirmation - nothing is removed. */
  async cancelDelete() {
    if (await this.cancelDeleteButton.isVisible().catch(() => false)) {
      await this.cancelDeleteButton.click({ force: true }).catch(() => {});
    } else {
      await this.page.keyboard.press("Escape").catch(() => {});
    }
    await this.page.waitForTimeout(2000);
  }

  /** !! DESTRUCTIVE !! Confirms the delete - the biller is really removed. */
  async confirmDelete() {
    await expect(this.confirmDeleteButton, "The delete confirmation should offer a confirm action").toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await this.confirmDeleteButton.click({ force: true });
    await this.page.waitForTimeout(3000);
  }

  /** The row's "Add to Favourites" control (star) - the 7th cell, after "Field Value". */
  favouriteControl(row) {
    const byName = row.getByRole("button", { name: /favou?rite|star/i }).first();
    return byName.or(row.getByRole("cell").nth(6).locator("button, img, svg").first());
  }

  /** The favourites panel entry for a biller (it renders outside the table). */
  favouriteEntry(billerName) {
    return this.favouritesPanel
      .locator("xpath=ancestor::*[3]")
      .getByText(new RegExp(billerName, "i"))
      .first();
  }

  /**
   * Returns the saved-biller row for `billerName`, retrying the (intermittently slow) list.
   * Shared by the payment and favourites flows.
   */
  async findRow(billerName) {
    const row = this.page.getByRole("row", { name: new RegExp(billerName, "i") }).first();
    for (let attempt = 0; attempt < 3; attempt++) {
      // Short per-attempt wait: the row either renders quickly or the table came back empty.
      if (await row.waitFor({ state: "visible", timeout: TIMEOUTS.QUICK }).then(() => true).catch(() => false)) {
        return row;
      }
      // The saved-billers table intermittently renders empty - re-fetch it via its tab.
      await this.savedBillersTab.click().catch(() => {});
      await this.page.waitForTimeout(2000);
    }
    const rows = (await this.page.getByRole("row").allInnerTexts().catch(() => []))
      .slice(1)
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    throw new Error(
      `No saved biller matching "${billerName}" is listed. ` +
        (rows.length ? `Saved billers on the page: ${rows.join(" / ")}.` : "The account has no saved billers at all.")
    );
  }

  /** ASSERTION: the favourites panel ("Your favourite list") is displayed. */
  async assertFavouritesPanelShown() {
    await expect(this.favouritesPanel, "The 'Your favourite list' panel should be visible").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /** True if the biller is already in the favourites panel. */
  async isFavourite(billerName) {
    return this.favouriteEntry(billerName).isVisible().catch(() => false);
  }

  /** How many times the biller appears in the favourites panel (duplicate check). */
  async favouriteEntryCount(billerName) {
    return this.favouritesPanel
      .locator("xpath=ancestor::*[3]")
      .getByText(new RegExp(billerName, "i"))
      .count()
      .catch(() => 0);
  }

  /**
   * Removes a biller from favourites by clicking its star again (the control toggles).
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

  /**
   * Clicks the row's "Add to Favourites" star. If the biller is already a favourite this is a
   * no-op (the caller checks isFavourite first), so the test stays re-runnable.
   */
  async addToFavourites(row, billerName) {
    const star = this.favouriteControl(row);
    await expect(star, `The "Add to Favourites" control should be available for "${billerName}"`).toBeVisible({
      timeout: TIMEOUTS.UI,
    });
    await star.click({ force: true });
  }

  /** ASSERTION: the biller now appears in the "Your favourite list" panel. */
  async assertAddedToFavourites(billerName) {
    await expect(
      this.favouriteEntry(billerName),
      `"${billerName}" should appear in the favourites list after being added`
    ).toBeVisible({ timeout: TIMEOUTS.LOAD });
  }

  // ---- Multiple (batch) payments ----

  /** How many saved billers are currently listed (data rows only). */
  async savedBillerCount() {
    const n = await this.page.getByRole("row").count().catch(() => 0);
    return Math.max(0, n - 1); // minus the header row
  }

  /** The template names currently listed, in table order. */
  async listedBillerNames() {
    const rows = this.page.locator("table tbody tr");
    const n = await rows.count().catch(() => 0);
    const names = [];
    for (let i = 0; i < n; i++) {
      // Template Name is the 3rd column (Add to List | S No. | Template Name | ...).
      const name = await rows.nth(i).getByRole("cell").nth(2).innerText().catch(() => "");
      if (name.trim()) names.push(name.trim());
    }
    return names;
  }

  /**
   * Ticks the "Add to List" checkbox of SEVERAL saved billers, then clicks "Pay Now" once to
   * pay them together. Each selected biller becomes its own block on the payment form.
   * @param {string[]} billerNames template names to include in the batch
   */
  async selectMultipleSavedBillers(billerNames) {
    for (const name of billerNames) {
      const row = await this.findRow(name);
      await row.locator('input[type="checkbox"]').check().catch(() => {});
      await expect(
        row.locator('input[type="checkbox"]'),
        `"${name}" should be ticked for the batch payment`
      ).toBeChecked({ timeout: TIMEOUTS.UI });
    }

    await expect(this.payNowButton, "'Pay Now' should appear once billers are selected").toBeVisible({
      timeout: TIMEOUTS.ACTION,
    });
    await this.payNowButton.click();

    // ASSERTION: the payment form opened for the batch.
    await expect(this.fromAccountSelect, "The payment form should open after 'Pay Now'").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
  }

  /**
   * ASSERTION: the payment form shows one block per selected biller.
   * // VERIFY the multi-block form against the live app (only a single-biller form was
   * // observable - the account has just one saved biller).
   */
  async assertBatchFormShows(billerNames) {
    for (const name of billerNames) {
      await expect(
        this.page.getByText(new RegExp(name, "i")).locator("visible=true").first(),
        `The batch payment form should include "${name}"`
      ).toBeVisible({ timeout: TIMEOUTS.LOAD });
    }
  }

  /**
   * Fills the amount (and the required "Re-enter reference") for EVERY block on the batch
   * payment form. Amount fields are indexed once more than one biller is selected.
   * @param {{ fromAccount?: string, amount?: string }} data
   */
  async fillBatchPayment(data) {
    if (data.fromAccount) {
      await selectOptionByLabelContains(this.fromAccountSelect, data.fromAccount).catch(() => {});
      await assertSelectedContains(this.fromAccountSelect, data.fromAccount, "Pay From account");
    }

    // Every editable amount field on the form (one per selected biller).
    const amounts = this.page.locator('input[name*="amount" i]').or(this.page.getByPlaceholder(/enter amount/i));
    const aN = await amounts.count().catch(() => 0);
    for (let i = 0; i < aN; i++) {
      const field = amounts.nth(i);
      if (data.amount && (await field.isEditable().catch(() => false))) {
        await field.fill(String(data.amount)).catch(() => {});
      }
    }

    // Every "Re-enter ..." reference field must mirror its pre-filled reference.
    const reEnters = this.page.getByPlaceholder(/re-?enter/i);
    const refs = this.page.locator('input[name^="fieldData."]');
    const rN = await reEnters.count().catch(() => 0);
    for (let i = 0; i < rN; i++) {
      const target = reEnters.nth(i);
      if (!(await target.isVisible().catch(() => false))) continue;
      const ref = (await refs.nth(i).inputValue().catch(() => "")) || data.referenceValue || "";
      if (ref) await target.fill(ref).catch(() => {});
    }
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
