const { test } = require("../../utils/fixtures");
const { TaxCertificatePage } = require("../../pages/TaxCertificatePage");
const { BalanceConfirmationPage } = require("../../pages/BalanceConfirmationPage");
const taxCertificate = require("../../test-data/taxCertificate");
const balanceConfirmation = require("../../test-data/balanceConfirmation");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Self Services — POSITIVE.
 * Request Tax Certificates (WHT/AIT) and Balance Confirmation. Both are request wizards
 * reached by direct route (the Self Services menu items are no-op links in this build).
 */
test.describe("Self Services - Positive", () => {
  test("TC_SELF_H01 - Verify that Request a WHT/AIT tax certificate", async ({ page, loggedInDashboard }) => {
    const tax = new TaxCertificatePage(page);

    await test.step("Open Self Services > Request Tax Certificates", async () => {
      await loggedInDashboard.goToTaxCertificates();
      await tax.assertLoaded();
    });

    await test.step("Step 1: choose the WHT/AIT certificate type", async () => {
      await tax.selectCertificateTypeAndContinue();
    });

    await test.step("Step 2: confirm the date range and continue", async () => {
      await tax.assertDateRangeStep();
      await tax.continueDateRange();
    });

    await test.step("Step 3: select the account", async () => {
      await tax.assertAccountStep();
      await tax.selectAccount(taxCertificate.account);
    });

    await test.step("Reach the confirmation step and place the request if allowed", async () => {
      await tax.reachConfirmation();
      await tax.assertConfirmationStep();
      // Confirm is disabled when the account/period has no WHT/AIT deduction to certify.
      await tax.confirmIfEnabled();
    });
  });

  test("TC_SELF_H02 - Verify that Request a Balance Confirmation", async ({ page, loggedInDashboard }) => {
    const balance = new BalanceConfirmationPage(page);

    await test.step("Open Self Services > Balance Confirmation", async () => {
      await loggedInDashboard.goToBalanceConfirmations();
      await balance.assertLoaded();
    });

    await test.step(`Step 1: choose the "${balanceConfirmation.confirmationType}" type`, async () => {
      await balance.selectConfirmationTypeAndContinue(balanceConfirmation.confirmationType);
    });

    await test.step("Step 2: pick the date range and continue", async () => {
      await balance.assertDateRangeStep();
      await balance.pickDateRange();
      await balance.continueToAccounts();
    });

    await test.step("Step 3: select an account", async () => {
      await balance.assertAccountStep();
      await balance.selectAccountAndContinue();
    });

    await test.step("Reach the confirmation step and place the request if allowed", async () => {
      await balance.assertConfirmationStep();
      await balance.confirmIfEnabled();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
