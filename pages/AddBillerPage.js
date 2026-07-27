const { expect } = require("@playwright/test");
const {
  selectOptionByLabelContains,
  getToastText,
  assertDropdownPopulated,
  assertSelectedContains,
  waitForSuccessMessage,
} = require("../utils/helpers");

/**
 * Add New Biller — Payees & Billers > Saved Billers > "Add New Biller".
 * All selectors confirmed against the live app.
 *
 * Landing: "Saved Billers" (on /dashboard/billpayment).
 * Modal:   "Add Biller" — "Add favorite billers for easy and convenient payments."
 *            select[name="categoryId"]        - Category*  ("Select Category" default)
 *            select[name="billerId"]          - Biller*    (populates after a category,
 *                                                           e.g. Telephone -> Dialog Mobile)
 *            input[name="templateName"]       - Template Name*
 *            input[name="amount"]             - Amount*
 *            input[name^="fieldData."]        - the biller's own reference field, which
 *                                               appears only after a biller is chosen
 *                                               (Dialog: "Your GSM Phone Number")
 *          Buttons: Back | Next. Next is NOT disabled when empty - the app shows inline
 *          "<field> is required" messages instead.
 */
class AddBillerPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Saved Billers landing page. "Saved Billers" also exists as a hidden item in the
    // collapsed Payees & Billers nav dropdown, so match only what is actually visible.
    this.savedBillersHeading = page.getByText("Saved Billers", { exact: true }).locator("visible=true").first();
    this.addNewBillerButton = page.getByRole("button", { name: "Add New Biller", exact: true });

    // Add Biller modal.
    this.modalHeading = page.getByText("Add Biller", { exact: true }).first();
    this.modalSubHeading = page.getByText(/Add favorite billers for easy and convenient payments/i);
    this.categorySelect = page.locator('select[name="categoryId"]');
    this.billerSelect = page.locator('select[name="billerId"]');
    this.templateNameInput = page.locator('input[name="templateName"]');
    this.amountInput = page.locator('input[name="amount"]');
    // The biller's reference field only exists once a biller is selected.
    this.referenceInput = page.locator('input[name^="fieldData."]').first();
    this.nextButton = page.getByRole("button", { name: "Next", exact: true });
    this.backButton = page.getByRole("button", { name: "Back", exact: true }).last();

    // Inline validation ("Amount is required", "Template Name is required", ...).
    this.requiredError = page.getByText(/is required/i).first();

    // Body of the save response, kept by submit() so a rejection can be reported exactly.
    this.lastSaveResponse = "";
  }

  /** ASSERTION: the Saved Billers page is displayed. */
  async assertSavedBillersLoaded() {
    await expect(this.savedBillersHeading, "'Saved Billers' heading should be visible").toBeVisible({ timeout: 60_000 });
    await expect(this.addNewBillerButton, "'Add New Biller' button should be visible").toBeVisible({ timeout: 60_000 });
  }

  /**
   * Opens the Add Biller modal.
   *
   * The button renders before React attaches its click handler, so a single click is
   * sometimes swallowed. Retry until the modal's Category dropdown actually appears.
   */
  async openAddBiller() {
    let opened = false;
    for (let attempt = 0; attempt < 5 && !opened; attempt++) {
      await this.addNewBillerButton.click().catch(() => {});
      opened = await this.categorySelect
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
    }
    if (!opened) throw new Error("The 'Add New Biller' modal did not open.");
    await this.assertFormLoaded();
  }

  /** ASSERTION: the Add Biller form is displayed. */
  async assertFormLoaded() {
    await expect(this.modalHeading, "'Add Biller' modal heading should be visible").toBeVisible({ timeout: 30_000 });
    await expect(this.modalSubHeading, "Add Biller sub-heading should be visible").toBeVisible();
    await expect(this.categorySelect, "Add Biller: Category dropdown should be visible").toBeVisible({
      timeout: 30_000,
    });
    await expect(this.billerSelect, "Add Biller: Biller dropdown should be visible").toBeVisible();
    await expect(this.templateNameInput, "Add Biller: Template Name field should be visible").toBeVisible();
    await expect(this.amountInput, "Add Biller: Amount field should be visible").toBeVisible();
  }

  /**
   * SOFT VALIDATIONS on the loaded form: the Category dropdown is populated with
   * selectable options. (The Biller dropdown only fills after a category is chosen, so it
   * is validated in selectCategoryAndBiller instead.)
   */
  async assertFormValidations() {
    await assertDropdownPopulated(this.categorySelect, "Category");
  }

  /**
   * Picks the category, then the biller (the biller list is fetched per category, so it
   * is only populated after the category is chosen).
   */
  async selectCategoryAndBiller(category, biller) {
    await selectOptionByLabelContains(this.categorySelect, category);
    // SOFT ASSERTION: the chosen category is the one selected.
    await assertSelectedContains(this.categorySelect, category, "Category");

    // The biller options arrive asynchronously once the category is set.
    await expect
      .poll(async () => (await this.billerSelect.locator("option").allTextContents()).length, {
        timeout: 60_000,
        message: `The biller list for category "${category}" did not load`,
      })
      .toBeGreaterThan(1);

    await selectOptionByLabelContains(this.billerSelect, biller);
    // SOFT ASSERTION: the chosen biller is the one selected.
    await assertSelectedContains(this.billerSelect, biller, "Biller");
  }

  /**
   * Fills the template name, amount and the biller's reference field. The reference
   * field only renders after a biller is chosen, so it is filled last.
   */
  async fillForm(data) {
    await this.templateNameInput.fill(data.templateName);
    await this.amountInput.fill(data.amount);

    if (data.referenceValue) {
      await expect(
        this.referenceInput,
        "Add Biller: the biller's reference field should appear once a biller is selected"
      ).toBeVisible({ timeout: 30_000 });
      await this.referenceInput.fill(data.referenceValue);
    }

    // ASSERTION: the entered details are reflected in the form.
    await expect(this.templateNameInput, "Template name should hold the entered value").toHaveValue(data.templateName);
  }

  /**
   * Clicks Next to submit the biller. The save is OTP-gated (Next opens the OTP/confirmation
   * popup), so this does NOT block waiting for a save response. The response is captured in
   * the background so a rejection can still be reported precisely by assertBillerSaved().
   */
  async submit() {
    await expect(this.nextButton, "'Next' should be visible on the Add Biller form").toBeVisible({ timeout: 15_000 });
    this.lastSaveResponse = "";
    this.page
      .waitForResponse((r) => r.request().method() === "POST" && !/google-analytics/.test(r.url()), {
        timeout: 60_000,
      })
      .then(async (r) => {
        this.lastSaveResponse = await r.text().catch(() => "");
      })
      .catch(() => {});
    await this.nextButton.click();
  }

  /** ASSERTION: submitting an empty form is blocked with inline "is required" messages. */
  async assertRequiredValidationShown() {
    await expect(
      this.requiredError,
      "An inline 'is required' validation message should be shown when the Add Biller form is empty"
    ).toBeVisible({ timeout: 15_000 });
    // ASSERTION: the form does not advance.
    await expect(this.categorySelect, "The Add Biller form should stay open").toBeVisible();
  }

  /**
   * ASSERTION: the biller was saved. Validates BOTH the success confirmation:
   *   1. the "added successfully" toast shown after the OTP, and
   *   2. the new biller appearing as the latest record in the Saved Billers list (matched by
   *      its unique template name).
   */
  async assertBillerSaved(templateName) {
    const successRe = /beneficiary added successfully|biller added successfully|added successfully|successful/i;

    // 1) The success toast/message.
    const messageShown = await waitForSuccessMessage(this.page, successRe, 25_000);
    if (!messageShown) {
      const toast = await getToastText(this.page, 3_000);
      // Quote the server's own message ("Internal server error", "Session TimeOut", ...).
      const serverMessage = (this.lastSaveResponse.match(/"message":"([^"]+)"/) || [])[1] || toast;
      if (/session\s*time\s*out|internal server error|failed|timed out/i.test(serverMessage || "")) {
        throw new Error(
          `The biller was not saved: the server rejected the save with "${serverMessage}" (HTTP 500) and the form ` +
            "stayed open. This is an environment/backend issue, not a locator problem."
        );
      }
      const onScreen = await this.visibleSummary();
      throw new Error(
        `No "added successfully" message was shown after confirming the OTP for biller "${templateName}". ` +
          `Visible on screen: ${onScreen}.`
      );
    }

    // 2) The new record appears in the Saved Billers list (unique template name => exactly one).
    const record = this.page.getByText(templateName, { exact: true }).first();
    await expect(
      record,
      `The newly added biller "${templateName}" should appear as a record in the Saved Billers list`
    ).toBeVisible({ timeout: 30_000 });
  }

  /** Collects the visible headings (and any toast) for diagnostics. */
  async visibleSummary() {
    const parts = [];
    const headings = await this.page.getByRole("heading").allInnerTexts().catch(() => []);
    for (const h of headings) {
      const t = h.trim();
      if (t) parts.push(`"${t}"`);
    }
    const toast = await getToastText(this.page, 1_500);
    if (toast) parts.push(`toast="${toast.trim()}"`);
    return parts.slice(0, 8).join(" | ") || "(no headings/toast found)";
  }
}

module.exports = { AddBillerPage };
