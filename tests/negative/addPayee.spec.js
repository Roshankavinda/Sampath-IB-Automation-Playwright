const { test } = require("../../utils/fixtures");
const { AddPayeePage } = require("../../pages/AddPayeePage");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Add New Payee — NEGATIVE / VALIDATION.
 * "Next" is not disabled on this form (once the bank list loads), so submitting it
 * empty must raise the inline "<field> is required" messages and keep the form open.
 */
test.describe("Add New Payee - Negative & Validation", () => {
  test("TC_PAYEE_N01 - Empty payee form is blocked with required-field errors", async ({
    page,
    loggedInDashboard,
  }) => {
    const payee = new AddPayeePage(page);

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await payee.assertSavedPayeesLoaded();
    });

    await test.step("Open 'Add New Payee' and validate the form", async () => {
      await payee.openAddPayee();
    });

    await test.step("Submit the empty form", async () => {
      await payee.nextButton.click();
    });

    await test.step("Validate the app blocks it with required-field messages", async () => {
      await payee.assertRequiredValidationShown();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
