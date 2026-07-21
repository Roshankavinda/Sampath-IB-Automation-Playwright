const { test } = require("../../utils/fixtures");
const { FixedDepositPage } = require("../../pages/FixedDepositPage");
const { fixedDeposit } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: FD Create (Open New Fixed Deposit) — POSITIVE.
 * Dashboard tile "Open New Fixed Deposit" -> step 1 resident type -> step 2 FD details
 * (product, tenure, interest mode, nickname, funding account, amount, source of funds,
 * interest-credit account) -> Continue -> review.
 */
test.describe("FD Create - Positive", () => {
  test("TC_FD_H01 - Open a new Fixed Deposit", async ({ page, loggedInDashboard }) => {
    const fd = new FixedDepositPage(page);

    await test.step("Open 'Open New Fixed Deposit' from the dashboard", async () => {
      await loggedInDashboard.goToOpenFixedDeposit();
      await fd.assertLoaded();
    });

    await test.step(`Step 1: choose resident type (${fixedDeposit.residentType})`, async () => {
      await fd.selectResidentType(fixedDeposit.residentType);
    });

    await test.step("Step 2: the FD details form is displayed", async () => {
      await fd.assertDetailsStepLoaded();
    });

    await test.step(`Step 2: select the product and the "${fixedDeposit.tenure}" tenure`, async () => {
      await fd.selectProductAndTenure(fixedDeposit);
    });

    await test.step("Step 2: validate the FD details form (dropdowns populated)", async () => {
      // Runs after the tenure is chosen: the Funding Account and Interest Payable Mode
      // dropdowns only appear once a tenure card is selected.
      await fd.assertFormValidations();
    });

    await test.step("Step 2: fill the FD details", async () => {
      await fd.fillDetails(fixedDeposit);
    });

    await test.step("Continue and validate the wizard advances past the details step", async () => {
      await fd.continueToReview();
      await fd.assertMovedPastDetailsStep();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
