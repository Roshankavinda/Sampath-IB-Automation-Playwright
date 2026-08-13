const { test, expect } = require("../../utils/fixtures");
const { LoanSettlementPage } = require("../../pages/LoanSettlementPage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Loan Settlement — NEGATIVE / VALIDATION.
 *   N01 the Loans page states its status (loan list or an explicit empty state)
 *   N02 the Loans page offers its action tiles
 *   N03 zero settlement amount is blocked
 *   N04 negative settlement amount is not accepted
 *
 * N03/N04 need an account WITH a loan and SKIP otherwise (this profile has none).
 */
test.describe("Loan Settlement - Negative & Validation", () => {
  const neg = negative.loanSettlement || {};

  async function openLoans(page, loggedInDashboard) {
    const loan = new LoanSettlementPage(page);
    await loggedInDashboard.goToLoans();
    await loan.assertLoaded();
    return loan;
  }

  test("TC_LOAN_N01 - Verify that the Loans page shows a loan list or an empty state", async ({
    page,
    loggedInDashboard,
  }) => {
    const loan = await openLoans(page, loggedInDashboard);
    const rows = await loan.loanRows.count().catch(() => 0);
    const empty = await loan.emptyState.first().isVisible().catch(() => false);
    expect(
      rows > 0 || empty,
      "The Loans page must show either loan rows or an explicit 'No data found' empty state"
    ).toBeTruthy();
  });

  test("TC_LOAN_N02 - Verify that the Loans page offers its action tiles", async ({ page, loggedInDashboard }) => {
    const loan = await openLoans(page, loggedInDashboard);
    await loan.assertPageValidations();
  });

  test("TC_LOAN_N03 - Verify that a zero settlement amount is blocked", async ({ page, loggedInDashboard }) => {
    const loan = await openLoans(page, loggedInDashboard);
    const hasLoan = (await loan.loanRows.count().catch(() => 0)) > 0;
    test.skip(!hasLoan, "This profile has no loans - a settlement amount cannot be validated.");

    await loan.openSettleLoan();
    await loan.fillSettlement({ ...neg.zeroAmount, amount: "0" });
    if (await loan.submitButton.isEnabled().catch(() => false)) {
      await loan.submitButton.click();
      await assertValidationError(page, "greater than|minimum|amount|valid|required");
    } else {
      await expect(loan.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_LOAN_N04 - Verify that a negative settlement amount is not accepted", async ({ page, loggedInDashboard }) => {
    const loan = await openLoans(page, loggedInDashboard);
    const hasLoan = (await loan.loanRows.count().catch(() => 0)) > 0;
    test.skip(!hasLoan, "This profile has no loans - a settlement amount cannot be validated.");

    await loan.openSettleLoan();
    await loan.fillSettlement({ ...neg.zeroAmount, amount: "-100" });
    const raw = await loan.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
