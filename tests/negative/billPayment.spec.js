const { test, expect } = require("../../utils/fixtures");
const { BillPaymentPage } = require("../../pages/BillPaymentPage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Bill Payment (Dialog & Mobitel) — NEGATIVE / VALIDATION.
 *   N01 the biller categories are displayed
 *   N02 mismatched "Re Enter" reference number is blocked
 *   N03 empty reference number is blocked
 */
test.describe("Bill Payment - Negative & Validation", () => {
  const neg = negative.billPayment;

  test("TC_BILL_N01 - Verify that Biller categories are displayed", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    await loggedInDashboard.goToBillPayment();
    await billPay.assertLoaded();
    await billPay.assertCategoriesDisplayed();
  });

  test("TC_BILL_N02 - Verify that Mismatched re-entered reference number is blocked", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    const data = neg.mismatchedReference;
    await loggedInDashboard.goToBillPayment();
    await billPay.assertLoaded();
    await billPay.selectCategory(data.category);
    await billPay.selectBiller(data.biller);
    await billPay.payByAccount(data.fromAccount);

    const hadReEnter = await billPay.fillMismatchedReference(
      data.referenceFieldName,
      data.referenceValue,
      data.reEnterValue
    );
    await billPay.fillAmountIfEditable(data.amount);
    await billPay.ensureOneTimeTransaction();

    test.skip(!hadReEnter, "This biller has no 'Re Enter' reference field to mismatch.");
    if (await billPay.nextButton.isEnabled().catch(() => false)) {
      await billPay.proceed();
      await assertValidationError(page, data.expectedError);
    } else {
      await expect(billPay.nextButton, "Proceed should stay disabled while the two references differ").toBeDisabled();
    }
  });

  test("TC_BILL_N03 - Verify that Empty reference number is blocked", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    const data = neg.emptyReference;
    await loggedInDashboard.goToBillPayment();
    await billPay.assertLoaded();
    await billPay.selectCategory(data.category);
    await billPay.selectBiller(data.biller);
    await billPay.payByAccount(data.fromAccount);

    // Leave the reference field empty and try to proceed.
    if (await billPay.nextButton.isEnabled().catch(() => false)) {
      await billPay.proceed();
      await assertValidationError(page, data.expectedError);
    } else {
      await expect(billPay.nextButton, "Proceed should stay disabled without a reference number").toBeDisabled();
    }
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
