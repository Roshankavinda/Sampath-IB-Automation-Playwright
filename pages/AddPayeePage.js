const { expect } = require("@playwright/test");
const {
  selectOptionByLabelContains,
  getToastText,
  assertDropdownPopulated,
  assertSelectedContains,
} = require("../utils/helpers");

/**
 * Add New Payee — Payees & Billers > Saved Payees > "Add New Payee".
 * All selectors confirmed against the live app.
 *
 * Landing: "Saved Payees" (on /dashboard/sendmoney), with filters
 *          All | Sampath Bank Accounts | Other Bank Accounts | Other Bank Cards.
 * Modal:   "Add New Payee" — "Create your own save beneficiary list for easy & fast
 *          transactions."
 *            select[name="type"]            - Account | Card
 *            input[name="accountName"]      - Account Holder's Name*   (maxlength 30)
 *            select[name="bank"]            - Bank*  (loads async, ~12s skeleton)
 *            input[name="nickName"]         - Nickname*                (maxlength 15)
 *            input[name="toAccountNumber"]  - Account Number*
 *          Buttons: Back | Next (Next stays disabled until the form is valid).
 */
class AddPayeePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;

    // Saved Payees landing page. "Saved Payees" also exists as a hidden item in the
    // collapsed Payees & Billers nav dropdown, so match only what is actually visible.
    this.savedPayeesHeading = page.getByText("Saved Payees", { exact: true }).locator("visible=true").first();
    this.filtersPrompt = page.getByText(/Use filters to fetch different account types/i);
    this.addNewPayeeButton = page.getByRole("button", { name: "Add New Payee", exact: true });

    // Add New Payee modal.
    this.modal = page.locator("div.fixed.inset-0.z-50").first();
    this.modalHeading = page.getByText("Add New Payee", { exact: true }).last();
    this.modalSubHeading = page.getByText(/Create your own save beneficiary list/i);
    this.typeSelect = page.locator('select[name="type"]');
    this.accountNameInput = page.locator('input[name="accountName"]');
    this.bankSelect = page.locator('select[name="bank"]');
    this.nickNameInput = page.locator('input[name="nickName"]');
    this.accountNumberInput = page.locator('input[name="toAccountNumber"]');
    this.nextButton = page.getByRole("button", { name: "Next", exact: true });
    this.backButton = page.getByRole("button", { name: "Back", exact: true }).last();

    // Inline validation ("Bank is required", "Nickname is required", ...). Next is NOT
    // disabled on this form once the bank list has loaded.
    this.requiredError = page.getByText(/is required/i).first();

    // Body of the save response, kept by submit() so a rejection can be reported exactly.
    this.lastSaveResponse = "";
  }

  /** ASSERTION: the Saved Payees page is displayed. */
  async assertSavedPayeesLoaded() {
    await expect(this.savedPayeesHeading, "'Saved Payees' heading should be visible").toBeVisible({ timeout: 60_000 });
    await expect(this.filtersPrompt, "The Saved Payees filter prompt should be visible").toBeVisible();
    await expect(this.addNewPayeeButton, "'Add New Payee' button should be visible").toBeVisible({ timeout: 60_000 });
  }

  /**
   * Opens the Add New Payee modal and waits for its async Bank dropdown.
   *
   * The button renders before React attaches its click handler, so a single click is
   * sometimes swallowed. Retry until the modal's Type dropdown actually appears.
   */
  async openAddPayee() {
    let opened = false;
    for (let attempt = 0; attempt < 5 && !opened; attempt++) {
      await this.addNewPayeeButton.click().catch(() => {});
      opened = await this.typeSelect
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
    }
    if (!opened) throw new Error("The 'Add New Payee' modal did not open.");
    await this.assertFormLoaded();
  }

  /**
   * ASSERTION: every field of the Add New Payee form is displayed.
   * The Bank dropdown is served asynchronously (it renders as a skeleton loader for
   * ~12s first), so it gets a generous wait of its own.
   */
  async assertFormLoaded() {
    await expect(this.modalHeading, "'Add New Payee' modal heading should be visible").toBeVisible({ timeout: 30_000 });
    await expect(this.modalSubHeading, "Add New Payee sub-heading should be visible").toBeVisible();
    await expect(this.accountNameInput, "Add New Payee: Account Holder's Name field should be visible").toBeVisible();
    await expect(this.nickNameInput, "Add New Payee: Nickname field should be visible").toBeVisible();
    await expect(this.accountNumberInput, "Add New Payee: Account Number field should be visible").toBeVisible();
    await expect(
      this.bankSelect,
      "Add New Payee: the Bank dropdown should load (it renders as a skeleton loader until the bank list arrives)"
    ).toBeVisible({ timeout: 90_000 });
  }

  /**
   * SOFT VALIDATIONS on the loaded form: the Type and Bank dropdowns are populated with
   * selectable options. Soft, so both are reported together.
   */
  async assertFormValidations() {
    await assertDropdownPopulated(this.typeSelect, "Payee Type");
    await assertDropdownPopulated(this.bankSelect, "Bank");
  }

  /**
   * Fills the payee form.
   *
   * Order matters: changing the Bank clears the Account Holder's Name, so both
   * dropdowns are set BEFORE the text fields are typed.
   */
  async fillForm(data) {
    if (data.type) {
      await selectOptionByLabelContains(this.typeSelect, data.type);
      // SOFT ASSERTION: the chosen payee type is the one selected.
      await assertSelectedContains(this.typeSelect, data.type, "Payee Type");
    }
    if (data.bank) {
      await selectOptionByLabelContains(this.bankSelect, data.bank);
      // SOFT ASSERTION: the chosen bank is the one selected.
      await assertSelectedContains(this.bankSelect, data.bank, "Bank");
    }

    await this.accountNameInput.fill(data.accountName);
    await this.nickNameInput.fill(data.nickName);
    await this.accountNumberInput.fill(data.accountNumber);

    // ASSERTION: the entered details are reflected in the form.
    await expect(this.accountNameInput, "Account holder's name should hold the entered value").toHaveValue(
      data.accountName
    );
    await expect(this.accountNumberInput, "Account number should hold the entered value").toHaveValue(
      data.accountNumber
    );
  }

  /** Clicks Next, keeping the save response so a rejection can be reported precisely. */
  async submit() {
    await expect(this.nextButton, "'Next' should be enabled once the payee form is valid").toBeEnabled({
      timeout: 20_000,
    });
    const savePromise = this.page
      .waitForResponse((r) => r.request().method() === "POST" && !/google-analytics/.test(r.url()), {
        timeout: 30_000,
      })
      .catch(() => null);
    await this.nextButton.click();
    const res = await savePromise;
    this.lastSaveResponse = res ? await res.text().catch(() => "") : "";
  }

  /** ASSERTION: an empty form is blocked with inline "<field> is required" messages. */
  async assertRequiredValidationShown() {
    await expect(
      this.requiredError,
      "An inline 'is required' validation message should be shown when the payee form is empty"
    ).toBeVisible({ timeout: 15_000 });
    // ASSERTION: the form does not advance.
    await expect(this.accountNumberInput, "The Add New Payee form should stay open").toBeVisible();
  }

  /**
   * ASSERTION: the payee was saved.
   *
   * The save is rejected by the backend in this environment ("Session TimeOut"), so
   * report that plainly rather than as a vague timeout.
   */
  async assertPayeeSaved(nickName) {
    const saved = await this.page
      .getByText(new RegExp(`success|saved|added|${nickName}`, "i"))
      .first()
      .waitFor({ state: "visible", timeout: 25_000 })
      .then(() => true)
      .catch(() => false);
    if (saved) return;

    const toast = await getToastText(this.page, 3_000);
    const serverSaidTimeout = /session\s*time\s*out|session expired|timed out/i.test(
      `${this.lastSaveResponse} ${toast}`
    );
    if (serverSaidTimeout) {
      throw new Error(
        'The payee was not saved: the server rejected the save with "Session TimeOut" and the form stayed open. ' +
          "This is the same environment/backend issue that blocks transactions, not a locator problem."
      );
    }
    throw new Error(
      `The payee "${nickName}" was not confirmed as saved.` + (toast ? ` Application showed: "${toast.trim()}".` : "")
    );
  }
}

module.exports = { AddPayeePage };
