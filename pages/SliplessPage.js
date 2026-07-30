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
  }

  /** ASSERTION: the Slipless Banking page with its tabs is displayed. */
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
