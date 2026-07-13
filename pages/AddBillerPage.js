const { expect } = require("@playwright/test");
const { selectOptionByLabelContains, getToastText } = require("../utils/helpers");

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
   * Picks the category, then the biller (the biller list is fetched per category, so it
   * is only populated after the category is chosen).
   */
  async selectCategoryAndBiller(category, biller) {
    await selectOptionByLabelContains(this.categorySelect, category);

    // The biller options arrive asynchronously once the category is set.
    await expect
      .poll(async () => (await this.billerSelect.locator("option").allTextContents()).length, {
        timeout: 60_000,
        message: `The biller list for category "${category}" did not load`,
      })
      .toBeGreaterThan(1);

    await selectOptionByLabelContains(this.billerSelect, biller);
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

  /** Clicks Next, keeping the save response so a rejection can be reported precisely. */
  async submit() {
    await expect(this.nextButton, "'Next' should be visible on the Add Biller form").toBeVisible({ timeout: 15_000 });
    const savePromise = this.page
      .waitForResponse((r) => r.request().method() === "POST" && !/google-analytics/.test(r.url()), {
        timeout: 30_000,
      })
      .catch(() => null);
    await this.nextButton.click();
    const res = await savePromise;
    this.lastSaveResponse = res ? await res.text().catch(() => "") : "";
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
   * ASSERTION: the biller was saved.
   *
   * The save is rejected by the backend in this environment ("Session TimeOut"), so
   * report that plainly rather than as a vague timeout.
   */
  async assertBillerSaved(templateName) {
    const saved = await this.page
      .getByText(new RegExp(`success|saved|added|${templateName}`, "i"))
      .first()
      .waitFor({ state: "visible", timeout: 25_000 })
      .then(() => true)
      .catch(() => false);
    if (saved) return;

    const toast = await getToastText(this.page, 3_000);
    // Quote the server's own message ("Internal server error", "Session TimeOut", ...).
    const serverMessage = (this.lastSaveResponse.match(/"message":"([^"]+)"/) || [])[1] || toast;
    if (/session\s*time\s*out|internal server error|failed|timed out/i.test(serverMessage || "")) {
      throw new Error(
        `The biller was not saved: the server rejected the save with "${serverMessage}" (HTTP 500) and the form ` +
          "stayed open. This is an environment/backend issue, not a locator problem."
      );
    }
    throw new Error(
      `The biller "${templateName}" was not confirmed as saved.` +
        (toast ? ` Application showed: "${toast.trim()}".` : "")
    );
  }
}

module.exports = { AddBillerPage };
