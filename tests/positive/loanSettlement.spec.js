const { test } = require("../../utils/fixtures");
const { LoanSettlementPage } = require("../../pages/LoanSettlementPage");
const loanSettlement = require("../../test-data/loanSettlement");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Loan Settlement — POSITIVE.
 * My Accounts > Loans -> "Settle Loan" -> settlement details -> Submit.
 *
 * NOTE: the logged-in account currently has NO loans (the Loan List shows "No data
 * found"), so this fails at openSettleLoan with a clear message until an account with an
 * active loan is used.
 */
test.describe("Loan Settlement - Positive", () => {
  test("TC_LOAN_H01 - Verify that Settle a loan", async ({ page, loggedInDashboard }) => {
    const loan = new LoanSettlementPage(page);

    await test.step("Navigate to My Accounts > Loans", async () => {
      await loggedInDashboard.goToLoans();
      await loan.assertLoaded();
      await loan.assertPageValidations();
    });

    await test.step("Open the Settle Loan flow", async () => {
      await loan.openSettleLoan();
    });

    await test.step("Fill the settlement details", async () => {
      await loan.fillSettlement(loanSettlement);
    });

    await test.step("Submit the loan settlement", async () => {
      await loan.submit();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
