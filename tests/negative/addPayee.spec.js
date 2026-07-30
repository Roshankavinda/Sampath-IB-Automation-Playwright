const { test, expect } = require("../../utils/fixtures");
const { AddPayeePage } = require("../../pages/AddPayeePage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Add New Payee — NEGATIVE / VALIDATION.
 *   N01 Type / Bank dropdowns display selectable values
 *   N02 empty form -> required-field errors
 *   N03 missing Nickname -> required
 *   N04 missing Account Number -> required
 *   N05 missing Account Holder's Name -> required
 * "Next" is not disabled on this form (once the bank list loads), so submitting an
 * incomplete form must raise the inline "<field> is required" messages and keep it open.
 */
test.describe("Add New Payee - Negative & Validation", () => {
  const neg = negative.newPayee;

  async function openForm(page, loggedInDashboard) {
    const payee = new AddPayeePage(page);
    await loggedInDashboard.goToSavedPayees();
    await payee.assertSavedPayeesLoaded();
    await payee.openAddPayee();
    return payee;
  }

  test("TC_PAYEE_N01 - Verify that Type / Bank dropdowns display selectable values", async ({ page, loggedInDashboard }) => {
    const payee = await openForm(page, loggedInDashboard);
    await payee.assertFormValidations();
  });

  test("TC_PAYEE_N02 - Verify that Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const payee = await openForm(page, loggedInDashboard);
    await payee.nextButton.click();
    await payee.assertRequiredValidationShown();
  });

  test("TC_PAYEE_N03 - Verify that Missing Nickname is blocked", async ({ page, loggedInDashboard }) => {
    const payee = await openForm(page, loggedInDashboard);
    await payee.fillPartial({
      type: neg.base.type,
      bank: neg.base.bank,
      accountName: neg.base.accountName,
      accountNumber: neg.base.accountNumber,
    });
    await payee.nextButton.click();
    await assertValidationError(page, neg.requiredFields.nickName);
  });

  test("TC_PAYEE_N04 - Verify that Missing Account Number is blocked", async ({ page, loggedInDashboard }) => {
    const payee = await openForm(page, loggedInDashboard);
    await payee.fillPartial({
      type: neg.base.type,
      bank: neg.base.bank,
      accountName: neg.base.accountName,
      nickName: neg.base.nickName,
    });
    await payee.nextButton.click();
    await assertValidationError(page, neg.requiredFields.accountNumber);
  });

  test("TC_PAYEE_N05 - Verify that Missing Account Holder's Name is blocked", async ({ page, loggedInDashboard }) => {
    const payee = await openForm(page, loggedInDashboard);
    await payee.fillPartial({
      type: neg.base.type,
      bank: neg.base.bank,
      nickName: neg.base.nickName,
      accountNumber: neg.base.accountNumber,
    });
    await payee.nextButton.click();
    await assertValidationError(page, neg.requiredFields.accountName);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
