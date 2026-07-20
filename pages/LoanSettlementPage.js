const { expect } = require("@playwright/test");

/**
 * Loan Settlement — My Accounts > Loans -> "Settle Loan".
 *
 * CONFIRMED against the live app: the Loans page (My Accounts / Loans, on
 * /dashboard/myaccount) with its "Loan Account Summary", the "Loan List", and three
 * clickable action tiles rendered as `div.w-[70px].cursor-pointer` wrapping a <span>:
 *   "New Loan" | "Settle Loan" | "View List"
 * The account currently has NO loans - the Loan List shows "No data found" - so clicking
 * "Settle Loan" does nothing and the settlement form could not be observed.
 *
 * // VERIFY: the settlement form that opens after "Settle Loan" (loan selection, amount,
 * // funding account, submit) needs confirming against an account that HOLDS a loan.
 */
class LoanSettlementPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByText(/my accounts \/ loans/i).first();
    this.loanSummary = page.getByText(/loan account summary/i).first();
    this.loanListHeading = page.getByText(/loan list/i).first();
    this.emptyState = page.getByText(/no data found/i);
    this.loanRows = page.locator("table tbody tr");

    // Action tiles: a <span> label inside a clickable div.cursor-pointer wrapper, so
    // target the wrapper (the span itself is not the click target).
    const tile = (label) =>
      page.locator('div[class*="cursor-pointer"]').filter({ hasText: new RegExp(`^\\s*${label}\\s*$`, "i") }).first();
    this.settleLoanTile = tile("Settle Loan");
    this.newLoanTile = tile("New Loan");
    this.viewListTile = tile("View List");

    // Settlement form (after Settle Loan). // VERIFY - never observed (no loans exist).
    this.loanSelect = page.locator('select[name="loanAccount"], select[name="loan"]').first();
    this.fromAccountSelect = page.locator('select[name="accountFrom"], select[name="dr_account_number"]').first();
    this.amountInput = page.locator('input[name="amount"]').first();
    this.submitButton = page.getByRole("button", { name: /^(submit|settle|pay|next|continue)$/i }).first();
  }

  /** ASSERTION: the Loans page with its action tiles is displayed. */
  async assertLoaded() {
    await expect(this.heading, "'My Accounts / Loans' should be visible").toBeVisible({ timeout: 60_000 });
    await expect(this.settleLoanTile, "'Settle Loan' action should be visible on the Loans page").toBeVisible({
      timeout: 30_000,
    });
  }

  /** SOFT VALIDATIONS: the Loans page shows its summary, list and all three actions. */
  async assertPageValidations() {
    await expect.soft(this.loanSummary, "'Loan Account Summary' should be shown").toBeVisible();
    await expect.soft(this.loanListHeading, "'Loan List' should be shown").toBeVisible();
    await expect.soft(this.newLoanTile, "'New Loan' action should be shown").toBeVisible();
    await expect.soft(this.settleLoanTile, "'Settle Loan' action should be shown").toBeVisible();
    await expect.soft(this.viewListTile, "'View List' action should be shown").toBeVisible();
  }

  /**
   * Opens the Settle Loan flow. Fails with an actionable message when the account holds
   * no loans (the current state), because the settlement form never opens.
   */
  async openSettleLoan() {
    // Race the loan list against the empty state, so "no loans" is reported clearly
    // instead of timing out on a click that can never do anything.
    const outcome = await Promise.race([
      this.loanRows.first().waitFor({ state: "visible", timeout: 30_000 }).then(() => "rows").catch(() => null),
      this.emptyState.first().waitFor({ state: "visible", timeout: 30_000 }).then(() => "empty").catch(() => null),
    ]);

    if (outcome !== "rows") {
      throw new Error(
        'Cannot settle a loan: the Loan List shows "No data found" - the logged-in account holds NO loans, so the ' +
          '"Settle Loan" action has nothing to act on and the settlement form never opens. Use an account that has ' +
          "an active loan, then this flow can be finalized."
      );
    }

    await this.settleLoanTile.click();

    // ASSERTION: the settlement form opened. // VERIFY the real fields once a loan exists.
    const opened = await this.amountInput
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      throw new Error(
        'The loan settlement form did not open after clicking "Settle Loan". If the account has no active loan this ' +
          "action is a no-op; otherwise the settlement form selectors need confirming against the live form."
      );
    }
  }

  /** Fills the settlement form. // VERIFY against a real loan settlement form. */
  async fillSettlement(data) {
    if (data.loan && (await this.loanSelect.isVisible().catch(() => false))) {
      await this.loanSelect.selectOption({ label: data.loan }).catch(() => {});
    }
    if (data.fromAccount && (await this.fromAccountSelect.isVisible().catch(() => false))) {
      await this.fromAccountSelect.selectOption({ label: data.fromAccount }).catch(() => {});
    }
    if (data.amount && (await this.amountInput.isEditable().catch(() => false))) {
      await this.amountInput.fill(data.amount);
    }
  }

  async submit() {
    await expect(this.submitButton, "Submit should be enabled once the settlement form is valid").toBeEnabled({
      timeout: 15_000,
    });
    await this.submitButton.click();
  }
}

module.exports = { LoanSettlementPage };
