const { test } = require("../../utils/fixtures");
const { AddPayeePage } = require("../../pages/AddPayeePage");
const { newPayee } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Add New Payee — POSITIVE.
 * Login -> Payees & Billers > Saved Payees -> Add New Payee ->
 * type / name / bank / nickname / account number -> Next -> payee saved.
 */
test.describe("Add New Payee - Positive", () => {
  test("TC_PAYEE_H01 - Add a new other-bank payee", async ({ page, loggedInDashboard }) => {
    const payee = new AddPayeePage(page);

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await payee.assertSavedPayeesLoaded();
    });

    await test.step("Open 'Add New Payee' and validate the form", async () => {
      await payee.openAddPayee();
      await payee.assertFormValidations();
    });

    await test.step("Fill the payee details", async () => {
      await payee.fillForm(newPayee);
    });

    await test.step("Submit and validate the payee is saved", async () => {
      await payee.submit();
      await payee.assertPayeeSaved(newPayee.nickName);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
