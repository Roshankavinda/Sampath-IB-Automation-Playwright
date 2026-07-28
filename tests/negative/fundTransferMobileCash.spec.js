const { test, expect } = require("../../utils/fixtures");
const { SendMoneyPage } = require("../../pages/SendMoneyPage");
const { MobileCashPage } = require("../../pages/MobileCashPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const negative = require("../../test-data/negative");
const { attachToastOnFailure, submitAndExpectRejection, assertValidationError } = require("../../utils/helpers");

/**
 * Feature: Fund Transfer - Mobile Cash — NEGATIVE / VALIDATION.
 *   N01 Purpose dropdown displays selectable values
 *   N02 empty form -> required-field errors
 *   N03 mismatched Mobile / Re-enter Mobile number is blocked
 *   N04 invalid (too-short) mobile number is rejected
 *   N05 missing Amount -> required
 *   N06 zero amount is blocked
 *   N07 non-numeric amount is not accepted
 *   N08 negative amount is not accepted
 */
test.describe("Fund Transfer - Mobile Cash - Negative & Validation", () => {
  const neg = negative.mobileCash;

  async function openForm(page, loggedInDashboard) {
    const sendMoney = new SendMoneyPage(page);
    const mobile = new MobileCashPage(page);
    await loggedInDashboard.goToSendMoney();
    await sendMoney.assertLoaded();
    await sendMoney.selectMobileCashTab();
    await mobile.assertLoaded();
    return mobile;
  }

  test("TC_FT_MCASH_N01 - Purpose dropdown displays selectable values", async ({ page, loggedInDashboard }) => {
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.assertPurposePopulated();
  });

  test("TC_FT_MCASH_N02 - Empty form is blocked with required-field errors", async ({ page, loggedInDashboard }) => {
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.submitButton.click();
    await assertValidationError(page, "is required");
    await expect(mobile.mobileNumberInput, "The Mobile Cash form should stay open").toBeVisible();
  });

  test("TC_FT_MCASH_N03 - Mismatched Mobile / Re-enter number is blocked", async ({ page, loggedInDashboard }) => {
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.fillPartial({
      nic: neg.base.nic,
      mobileNumber: neg.mismatchedMobile.mobileNumber,
      reMobileNumber: neg.mismatchedMobile.reMobileNumber,
      receiverName: neg.base.receiverName,
      purpose: neg.base.purpose,
      amount: neg.base.amount,
    });
    await mobile.submitButton.click().catch(() => {});
    await assertValidationError(page, neg.mismatchedMobile.expectedError);
  });

  test("TC_FT_MCASH_N04 - Invalid (too-short) mobile number is rejected", async ({ page, loggedInDashboard }) => {
    const popup = new ConfirmationPopup(page);
    const data = neg.invalidMobile;
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.fillForm(data);

    const enabled = await mobile.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await mobile.submit();
      await submitAndExpectRejection(page, popup, data.expectedError, credentials.otp);
    } else {
      await expect(mobile.submitButton, "Submit should stay disabled for an invalid mobile number").toBeDisabled();
    }
  });

  test("TC_FT_MCASH_N05 - Missing Amount is blocked", async ({ page, loggedInDashboard }) => {
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.fillPartial({
      nic: neg.base.nic,
      mobileNumber: neg.base.mobileNumber,
      reMobileNumber: neg.base.mobileNumber,
      receiverName: neg.base.receiverName,
      purpose: neg.base.purpose,
    });
    await mobile.submitButton.click();
    await assertValidationError(page, neg.requiredFields.amount);
  });

  test("TC_FT_MCASH_N06 - Zero amount is blocked", async ({ page, loggedInDashboard }) => {
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.fillPartial({
      nic: neg.base.nic,
      mobileNumber: neg.base.mobileNumber,
      reMobileNumber: neg.base.mobileNumber,
      receiverName: neg.base.receiverName,
      purpose: neg.base.purpose,
      amount: neg.zeroAmount.amount,
    });
    const enabled = await mobile.submitButton.isEnabled().catch(() => false);
    if (enabled) {
      await mobile.submitButton.click();
      await assertValidationError(page, neg.zeroAmount.expectedError);
    } else {
      await expect(mobile.submitButton, "Submit should stay disabled for a zero amount").toBeDisabled();
    }
  });

  test("TC_FT_MCASH_N07 - Non-numeric amount is not accepted", async ({ page, loggedInDashboard }) => {
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.fillPartial({
      nic: neg.base.nic,
      mobileNumber: neg.base.mobileNumber,
      reMobileNumber: neg.base.mobileNumber,
      receiverName: neg.base.receiverName,
      purpose: neg.base.purpose,
      amount: neg.nonNumericAmount.amount,
    });
    await mobile.submitButton.click();
    await assertValidationError(page, neg.nonNumericAmount.expectedError);
  });

  test("TC_FT_MCASH_N08 - Negative amount is not accepted", async ({ page, loggedInDashboard }) => {
    const mobile = await openForm(page, loggedInDashboard);
    await mobile.fillPartial({
      nic: neg.base.nic,
      mobileNumber: neg.base.mobileNumber,
      reMobileNumber: neg.base.mobileNumber,
      receiverName: neg.base.receiverName,
      purpose: neg.base.purpose,
      amount: neg.negativeAmount.amount,
    });
    const raw = await mobile.amountInput.inputValue().catch(() => "");
    expect(raw, "The amount field must not retain a negative value").not.toContain("-");
    await mobile.submitButton.click();
    await assertValidationError(page, neg.negativeAmount.expectedError);
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
