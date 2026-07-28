const { expect } = require("@playwright/test");
const {
  selectOptionByLabelContains,
  getToastText,
  assertDropdownPopulated,
  assertSelectedContains,
  waitForSuccessMessage,
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

  /**
   * Fills ONLY the provided fields (skips undefined) - for partial "<field> is required"
   * negatives. Dropdowns first (changing the Bank clears the Account Holder's Name).
   */
  async fillPartial({ type, bank, accountName, nickName, accountNumber } = {}) {
    if (type) await selectOptionByLabelContains(this.typeSelect, type).catch(() => {});
    if (bank) await selectOptionByLabelContains(this.bankSelect, bank).catch(() => {});
    if (accountName) await this.accountNameInput.fill(accountName);
    if (nickName) await this.nickNameInput.fill(nickName);
    if (accountNumber) await this.accountNumberInput.fill(accountNumber);
  }

  /**
   * Clicks Next to submit the payee. The save is OTP-gated: clicking Next opens the OTP/
   * confirmation popup, so this does NOT block waiting for a save response (that only lands
   * after the OTP is confirmed). The save response is captured in the background so a
   * rejection can still be reported precisely by assertPayeeSaved().
   */
  async submit() {
    await expect(this.nextButton, "'Next' should be enabled once the payee form is valid").toBeEnabled({
      timeout: 20_000,
    });
    // Best-effort background capture of the save response (available by the time we assert).
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
   * ASSERTION: the payee was saved. Validates BOTH the success confirmation:
   *   1. the "Beneficiary added successfully" toast shown after the OTP, and
   *   2. the new payee appearing as the latest record in the Saved Payees table (matched by
   *      its unique nickname).
   */
  async assertPayeeSaved(nickName) {
    const successRe = /beneficiary added successfully|added successfully|payee added|successful/i;

    // 1) The success toast/message.
    const messageShown = await waitForSuccessMessage(this.page, successRe, 25_000);
    if (!messageShown) {
      const toast = await getToastText(this.page, 3_000);
      const serverSaidTimeout = /session\s*time\s*out|session expired|timed out/i.test(
        `${this.lastSaveResponse} ${toast}`
      );
      if (serverSaidTimeout) {
        throw new Error(
          'The payee was not saved: the server rejected the save with "Session TimeOut". ' +
            "This is the same environment/backend issue that blocks transactions, not a locator problem."
        );
      }
      const onScreen = await this.visibleSummary();
      throw new Error(
        `No "Beneficiary added successfully" message was shown after confirming the OTP for "${nickName}". ` +
          `Visible on screen: ${onScreen}.`
      );
    }

    // 2) The new record appears in the Saved Payees table (unique nickname => exactly one).
    const payeeCell = this.page.getByRole("cell", { name: nickName, exact: true }).first();
    await expect(
      payeeCell,
      `The newly added payee "${nickName}" should appear as a record in the Saved Payees table`
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

module.exports = { AddPayeePage };
