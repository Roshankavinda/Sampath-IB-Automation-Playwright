const { test, expect } = require("../../utils/fixtures");
const { BillPaymentPage } = require("../../pages/BillPaymentPage");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Bill Payment (Dialog & Mobitel) — NEGATIVE / VALIDATION.
 * A mismatched "Re Enter" reference number must be rejected or keep Proceed disabled.
 */
test.describe("Bill Payment - Negative & Validation", () => {
  test("TC_BILL_N01 - Mismatched re-entered reference number is blocked", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    const data = negative.billPayment.mismatchedReference;

    await test.step("Navigate to Bill Payment and open the Dialog biller", async () => {
      await loggedInDashboard.goToBillPayment();
      await billPay.assertLoaded();
      await billPay.selectCategory(data.category);
      await billPay.selectBiller(data.biller);
      await billPay.payByAccount(data.fromAccount);
    });

    let hadReEnter = false;
    await test.step("Enter mismatched reference / re-enter values", async () => {
      hadReEnter = await billPay.fillMismatchedReference(
        data.referenceFieldName,
        data.referenceValue,
        data.reEnterValue
      );
      await billPay.fillAmountIfEditable(data.amount);
      await billPay.ensureOneTimeTransaction();
    });

    await test.step("Assert the mismatch is blocked (error shown or Proceed disabled)", async () => {
      test.skip(!hadReEnter, "This biller has no 'Re Enter' reference field to mismatch.");
      const enabled = await billPay.nextButton.isEnabled().catch(() => false);
      if (enabled) {
        await billPay.proceed();
        await assertValidationError(page, data.expectedError);
      } else {
        await expect(billPay.nextButton, "Proceed should stay disabled while the two references differ").toBeDisabled();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
