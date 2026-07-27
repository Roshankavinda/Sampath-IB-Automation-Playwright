const { test } = require("../../utils/fixtures");
const { AddBillerPage } = require("../../pages/AddBillerPage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Add New Biller — NEGATIVE / VALIDATION.
 * "Next" is not disabled on this form, so submitting it empty must raise the inline
 * "<field> is required" validation messages and keep the form open.
 */
test.describe("Add New Biller - Negative & Validation", () => {
  test("TC_BILLER_N01 - Empty biller form is blocked with required-field errors", async ({
    page,
    loggedInDashboard,
  }) => {
    const biller = new AddBillerPage(page);

    await test.step("Navigate to Payees & Billers > Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await biller.assertSavedBillersLoaded();
    });

    await test.step("Open 'Add New Biller' and validate the form", async () => {
      await biller.openAddBiller();
    });

    await test.step("Submit the empty form", async () => {
      await biller.submit();
    });

    await test.step("Validate the app blocks it with required-field messages", async () => {
      await biller.assertRequiredValidationShown();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
