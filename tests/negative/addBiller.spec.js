const { test } = require("../../utils/fixtures");
const { AddBillerPage } = require("../../pages/AddBillerPage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Add New Biller — NEGATIVE / VALIDATION.
 *   N01 Category dropdown displays selectable values
 *   N02 empty form -> required-field errors
 *   N03 missing Template Name -> required
 *   N04 missing Amount -> required
 *   N05 zero amount is blocked
 * "Next" is not disabled on this form, so submitting an incomplete form must raise the
 * inline "<field> is required" validation messages and keep the form open.
 */
test.describe("Add New Biller - Negative & Validation", () => {
  const neg = negative.newBiller;

  async function openForm(page, loggedInDashboard) {
    const biller = new AddBillerPage(page);
    await loggedInDashboard.goToSavedBillers();
    await biller.assertSavedBillersLoaded();
    await biller.openAddBiller();
    return biller;
  }

  test("TC_BILLER_N01 - Category dropdown displays selectable values", async ({ page, loggedInDashboard }) => {
    const biller = await openForm(page, loggedInDashboard);
    await biller.assertFormValidations();
  });

  test("TC_BILLER_N02 - Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const biller = await openForm(page, loggedInDashboard);
    await biller.nextButton.click();
    await biller.assertRequiredValidationShown();
  });

  test("TC_BILLER_N03 - Missing Template Name is blocked", async ({ page, loggedInDashboard }) => {
    const biller = await openForm(page, loggedInDashboard);
    await biller.selectCategoryAndBiller(neg.base.category, neg.base.biller);
    await biller.fillPartial({ amount: neg.base.amount, referenceValue: neg.base.referenceValue });
    await biller.nextButton.click();
    await assertValidationError(page, neg.requiredFields.templateName);
  });

  test("TC_BILLER_N04 - Missing Amount is blocked", async ({ page, loggedInDashboard }) => {
    const biller = await openForm(page, loggedInDashboard);
    await biller.selectCategoryAndBiller(neg.base.category, neg.base.biller);
    await biller.fillPartial({ templateName: neg.base.templateName, referenceValue: neg.base.referenceValue });
    await biller.nextButton.click();
    await assertValidationError(page, neg.requiredFields.amount);
  });

  test("TC_BILLER_N05 - Zero amount is blocked", async ({ page, loggedInDashboard }) => {
    const biller = await openForm(page, loggedInDashboard);
    await biller.selectCategoryAndBiller(neg.base.category, neg.base.biller);
    await biller.fillPartial({
      templateName: neg.base.templateName,
      amount: neg.zeroAmount.amount,
      referenceValue: neg.base.referenceValue,
    });
    await biller.nextButton.click();
    await assertValidationError(page, neg.zeroAmount.expectedError);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
