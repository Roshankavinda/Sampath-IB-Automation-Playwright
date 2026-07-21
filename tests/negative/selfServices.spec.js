const { test, expect } = require("../../utils/fixtures");
const { TaxCertificatePage } = require("../../pages/TaxCertificatePage");
const { BalanceConfirmationPage } = require("../../pages/BalanceConfirmationPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Self Services — NEGATIVE / VALIDATION.
 * On step 1 of each request wizard, "Next" must stay disabled until a type is chosen.
 */
test.describe("Self Services - Negative & Validation", () => {
  test("TC_SELF_N01 - Tax certificate: Next disabled until a type is chosen", async ({ page, loggedInDashboard }) => {
    const tax = new TaxCertificatePage(page);

    await test.step("Open Request Tax Certificates", async () => {
      await loggedInDashboard.goToTaxCertificates();
      await tax.assertLoaded();
    });

    await test.step("With no certificate type chosen, 'Next' must be disabled", async () => {
      await expect(tax.nextButton, "Next should be disabled until a certificate type is chosen").toBeDisabled({
        timeout: 15_000,
      });
    });
  });

  test("TC_SELF_N02 - Balance confirmation: Next disabled until a type is chosen", async ({
    page,
    loggedInDashboard,
  }) => {
    const balance = new BalanceConfirmationPage(page);

    await test.step("Open Balance Confirmation", async () => {
      await loggedInDashboard.goToBalanceConfirmations();
      await balance.assertLoaded();
    });

    await test.step("With no confirmation type chosen, 'Next' must be disabled", async () => {
      await expect(balance.nextButton, "Next should be disabled until a confirmation type is chosen").toBeDisabled({
        timeout: 15_000,
      });
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
