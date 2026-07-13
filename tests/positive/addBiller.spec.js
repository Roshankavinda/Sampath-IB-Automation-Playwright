const { test } = require("../../utils/fixtures");
const { AddBillerPage } = require("../../pages/AddBillerPage");
const { newBiller } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Add New Biller — POSITIVE.
 * Login -> Payees & Billers > Saved Billers -> Add New Biller ->
 * category / biller / template name / amount / reference -> Next -> biller saved.
 */
test.describe("Add New Biller - Positive", () => {
  test("TC_BILLER_H01 - Add a new Dialog biller", async ({ page, loggedInDashboard }) => {
    const biller = new AddBillerPage(page);

    await test.step("Navigate to Payees & Billers > Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await biller.assertSavedBillersLoaded();
    });

    await test.step("Open 'Add New Biller' and validate the form", async () => {
      await biller.openAddBiller();
    });

    await test.step(`Select the "${newBiller.category}" category and the "${newBiller.biller}" biller`, async () => {
      await biller.selectCategoryAndBiller(newBiller.category, newBiller.biller);
    });

    await test.step("Fill the template name, amount and biller reference", async () => {
      await biller.fillForm(newBiller);
    });

    await test.step("Submit and validate the biller is saved", async () => {
      await biller.submit();
      await biller.assertBillerSaved(newBiller.templateName);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
