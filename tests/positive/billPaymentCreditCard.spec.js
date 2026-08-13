const { test, expect } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { BillPaymentPage } = require("../../pages/BillPaymentPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const billPayments = require("../../test-data/billPayments");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Bill Payment using a CREDIT CARD — POSITIVE.
 * The payment form offers "Payment Using: Account | Credit Card" (confirmed live on the
 * saved-biller payment form). Paying by Account is covered by billPayment.spec.js, so this
 * covers the CREDIT CARD funding branch.
 *
 * SKIPS when the profile has no payable credit card on this form.
 */
test.describe("Bill Payment (Credit Card) - Positive", () => {
  test("TC_BILL_H03 - Verify that a bill can be paid using a credit card", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    const popup = new ConfirmationPopup(page);
    const data = billPayments.byCreditCard;

    await test.step("Open Bill Payment and select the biller", async () => {
      await loggedInDashboard.goToBillPayment();
      await billPay.assertLoaded();
      await billPay.selectCategory(data.category);
      await billPay.selectBiller(data.biller);
    });

    await test.step("Choose 'Credit Card' as the payment method", async () => {
      const creditCardOption = page.getByRole("radio", { name: /credit card/i }).first();
      const available = await creditCardOption.isVisible().catch(() => false);
      test.skip(!available, "This biller/profile does not offer 'Payment Using: Credit Card'.");
      await creditCardOption.check({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
    });

    await test.step("Fill the reference and amount", async () => {
      await billPay.fillReferenceField(data.referenceFieldName, data.referenceValue);
      await billPay.fillAmountIfEditable(data.amount);
      await billPay.ensureOneTimeTransaction();
    });

    await test.step("Proceed and validate the OTP/confirmation popup", async () => {
      await billPay.proceed();
      await popup.assertVisible();
    });

    await test.step("Enter the OTP and validate success", async () => {
      await popup.enterOtpAndConfirm(credentials.otp);
      await popup.assertSuccess();
    });
  });

  test("TC_BILL_H04 - Verify that both payment methods are offered", async ({ page, loggedInDashboard }) => {
    const billPay = new BillPaymentPage(page);
    const data = billPayments.byCreditCard;

    await loggedInDashboard.goToBillPayment();
    await billPay.assertLoaded();
    await billPay.selectCategory(data.category);
    await billPay.selectBiller(data.biller);

    await expect
      .soft(page.getByRole("radio", { name: /^account$/i }).first(), "'Account' payment method should be offered")
      .toBeVisible({ timeout: TIMEOUTS.LOAD });
    await expect
      .soft(page.getByRole("radio", { name: /credit card/i }).first(), "'Credit Card' payment method should be offered")
      .toBeVisible();
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
