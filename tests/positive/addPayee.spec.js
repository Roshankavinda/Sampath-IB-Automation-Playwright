const { test } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { AddPayeePage } = require("../../pages/AddPayeePage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const newPayee = require("../../test-data/newPayee");
const { attachToastOnFailure, randomNickname } = require("../../utils/helpers");

/**
 * Feature: Add New Payee — POSITIVE.
 * Login -> Payees & Billers > Saved Payees -> Add New Payee ->
 * type / name / bank / nickname / account number -> Next -> OTP -> payee saved.
 *
 * The save is OTP-gated: after Next, a real OTP is sent to your phone and entered MANUALLY
 * by default (run headed). Set IB_MANUAL_OTP=false to auto-fill the bypass code.
 */
test.describe("Add New Payee - Positive", () => {
  test("TC_PAYEE_H01 - Verify that Add a new other-bank payee", async ({ page, loggedInDashboard }) => {
    const payee = new AddPayeePage(page);
    // A unique nickname per run so each run adds a distinct, identifiable record.
    const nickName = randomNickname("PW");

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await payee.assertSavedPayeesLoaded();
    });

    await test.step("Open 'Add New Payee' and validate the form", async () => {
      await payee.openAddPayee();
      await payee.assertFormValidations();
    });

    await test.step(`Fill the payee details (nickname "${nickName}")`, async () => {
      await payee.fillForm({ ...newPayee, nickName });
    });

    await test.step("Submit and enter the OTP (if requested)", async () => {
      await payee.submit();
      const popup = new ConfirmationPopup(page);
      const otpRequested = await popup.otpBoxes
        .first()
        .waitFor({ state: "visible", timeout: TIMEOUTS.ACTION })
        .then(() => true)
        .catch(() => false);
      if (otpRequested) {
        await popup.enterOtpAndConfirm(credentials.otp);
      }
    });

    await test.step("Validate the success message and the new record in the table", async () => {
      await payee.assertPayeeSaved(nickName);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
