const { expect } = require("@playwright/test");
const TIMEOUTS = require("../config/timeouts");
const {
  selectOptionByLabelContains,
  assertDropdownPopulated,
  assertSelectedContains,
  getToastText,
} = require("../utils/helpers");

/**
 * Slipless Banking — dashboard Quick Actions tile "Sampath Slipless"
 * (/dashboard/slipless-banking). All selectors confirmed against the live app.
 *
 * Tabs: Cash Deposit | Cash Withdrawal | My Payees | Inquiry.
 *
 * Cash Deposit form:
 *   input[name="accountType"] radios (Own Account | Other Accounts)
 *   select[name="accountFrom"]  - the account (options have NO "AVL." prefix here)
 *   input[name="amount"]        - Amount
 *   "Next"  -> SMS OTP modal (6 x input.otp-box + Cancel/Confirm)
 *
 * Cash Withdrawal form:
 *   select[name="accountNumber"] - the account
 *   input[name="amount"]         - Amount
 *   "Proceed"  -> OTP / confirmation
 */
class SliplessPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/slipless banking/i).first();
    this.cashDepositTab = page.getByRole("button", { name: "Cash Deposit", exact: true });
    this.cashWithdrawalTab = page.getByRole("button", { name: "Cash Withdrawal", exact: true });
    this.myPayeesTab = page.getByRole("button", { name: "My Payees", exact: true });
    this.inquiryTab = page.getByRole("button", { name: "Inquiry", exact: true });

    // Deposit form
    this.accountTypeRadios = page.locator('input[name="accountType"]');
    this.depositAccountSelect = page.locator('select[name="accountFrom"]');
    // Withdrawal form
    this.withdrawalAccountSelect = page.locator('select[name="accountNumber"]');
    // Shared (only the active tab's form is rendered, so a single amount input is present)
    this.amountInput = page.locator('input[name="amount"]');
    this.nextButton = page.getByRole("button", { name: "Next", exact: true });
    this.proceedButton = page.getByRole("button", { name: "Proceed", exact: true });

    // ---- My Payees tab (confirmed live) ----
    // "Saved Payees / Manage your all time saved payees." + an "Add New Payee" button.
    this.payeesHeading = page.getByText(/manage your all time saved payees/i).first();
    this.addNewPayeeButton = page.getByRole("button", { name: /add new payee/i }).first();
    this.payeeRows = page.locator("table tbody tr");

    // ---- Inquiry tab (confirmed live) ----
    // "Inquiries / View all slipless inquiries." + Filters button + Search box.
    this.inquiryHeading = page.getByText(/view all slipless inquiries/i).first();
    this.filtersButton = page.getByRole("button", { name: /^filters?$/i }).first();
    this.inquirySearch = page.getByPlaceholder(/^search$/i).first();
    this.inquiryRows = page.locator("table tbody tr");

    // Shared: the right-hand "Recently Generated Deposit Slips" panel, empty/error states.
    this.recentSlipsPanel = page.getByText(/recently generated deposit slips/i).first();
    this.emptyState = page.getByText(/no .*(payees?|inquir|data|records|found)/i).locator("visible=true").first();
    this.errorState = page.getByText(/error loading data|failed to load|something went wrong/i).locator("visible=true").first();
  }

  /** ASSERTION: the Slipless Banking page with its tabs is displayed. */
  /** Opens the My Payees tab and asserts its section is displayed. */
  async openMyPayees() {
    await this.myPayeesTab.click({ force: true });
    await expect(this.payeesHeading, "The Saved Payees section should be shown on the My Payees tab").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.page.waitForTimeout(3000);
  }

  /** Opens the Inquiry tab and asserts its section is displayed. */
  async openInquiry() {
    await this.inquiryTab.click({ force: true });
    await expect(this.inquiryHeading, "The Inquiries section should be shown on the Inquiry tab").toBeVisible({
      timeout: TIMEOUTS.LOAD,
    });
    await this.page.waitForTimeout(4000);
  }

  /**
   * ASSERTION: a listing shows rows or an explicit empty state (polls the async render).
   * Returns { rows, empty, error } so callers can also see a backend error state.
   */
  async readListState(rowsLocator) {
    let rows = 0;
    let empty = false;
    let error = false;
    for (let i = 0; i < 12; i++) {
      rows = await rowsLocator.count().catch(() => 0);
      empty = await this.emptyState.isVisible().catch(() => false);
      error = await this.errorState.isVisible().catch(() => false);
      // Rows or an error are final. An "empty" read is only trusted once the list has had
      // time to settle - the backend's "Error loading data" renders a few seconds AFTER the
      // initial empty frame, and must not be mistaken for a legitimately empty list.
      if (rows > 0 || error) break;
      if (empty && i >= 5) break;
      await this.page.waitForTimeout(1000);
    }
    return { rows, empty, error };
  }

  async assertLoaded() {
    await expect(this.heading, "'Slipless Banking' heading should be visible").toBeVisible({ timeout: TIMEOUTS.SLOW_LOAD });
    await expect(this.cashDepositTab, "'Cash Deposit' tab should be visible").toBeVisible({ timeout: TIMEOUTS.LOAD });
    await expect(this.cashWithdrawalTab, "'Cash Withdrawal' tab should be visible").toBeVisible();
  }

  // ---- Cash Deposit ----

  async selectCashDeposit() {
    // The tab's form + async account dropdown occasionally don't render on the first
    // click, so retry until the account dropdown appears.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.cashDepositTab.click().catch(() => {});
      const ok = await this.depositAccountSelect
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (ok) return;
    }
    throw new Error("The Cash Deposit form (account dropdown) did not load after selecting the tab.");
  }

  /** SOFT VALIDATIONS on the deposit form. */
  async assertDepositFormValidations() {
    await assertDropdownPopulated(this.depositAccountSelect, "Deposit Account");
    await expect.soft(this.accountTypeRadios.first(), "An Account Type option should be shown").toBeVisible();
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
    await expect.soft(this.nextButton, "Next button should be visible").toBeVisible();
  }

  async fillDeposit(data) {
    // Own Account is the default; switch to Other Accounts only when asked.
    if (data.accountType && /other/i.test(data.accountType)) {
      await this.accountTypeRadios.nth(1).check({ force: true }).catch(() => {});
    }
    await selectOptionByLabelContains(this.depositAccountSelect, data.account);
    await assertSelectedContains(this.depositAccountSelect, data.account, "Deposit Account");
    await this.amountInput.fill(data.amount);
  }

  async submitDeposit() {
    await expect(this.nextButton, "'Next' should be enabled once the deposit form is valid").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.nextButton.click();
  }

  // ---- Cash Withdrawal ----

  async selectCashWithdrawal() {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.cashWithdrawalTab.click().catch(() => {});
      const ok = await this.withdrawalAccountSelect
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (ok) return;
    }
    throw new Error("The Cash Withdrawal form (account dropdown) did not load after selecting the tab.");
  }

  /** SOFT VALIDATIONS on the withdrawal form. */
  async assertWithdrawalFormValidations() {
    await assertDropdownPopulated(this.withdrawalAccountSelect, "Withdrawal Account");
    await expect.soft(this.amountInput, "Amount field should be visible").toBeVisible();
    await expect.soft(this.proceedButton, "Proceed button should be visible").toBeVisible();
  }

  async fillWithdrawal(data) {
    await selectOptionByLabelContains(this.withdrawalAccountSelect, data.account);
    await assertSelectedContains(this.withdrawalAccountSelect, data.account, "Withdrawal Account");
    await this.amountInput.fill(data.amount);
  }

  async submitWithdrawal() {
    await expect(this.proceedButton, "'Proceed' should be enabled once the withdrawal form is valid").toBeEnabled({
      timeout: TIMEOUTS.UI,
    });
    await this.proceedButton.click();
  }

  /** ASSERTION: the slipless request succeeded (a slip/reference is generated). */
  async assertSuccess() {
    const success = this.page
      .getByText(/success|successful|slip.*generated|generated.*slip|reference|completed|receipt/i)
      .first();
    const ok = await success
      .waitFor({ state: "visible", timeout: TIMEOUTS.LOAD })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      const toast = await getToastText(this.page, 2_000);
      throw new Error(
        "The slipless request was not confirmed as successful." + (toast ? ` Application showed: "${toast}".` : "")
      );
    }
  }
}

module.exports = { SliplessPage };
