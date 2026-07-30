const { test } = require("../../utils/fixtures");
const TIMEOUTS = require("../../config/timeouts");
const { AddBillerPage } = require("../../pages/AddBillerPage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const newBiller = require("../../test-data/newBiller");
const { attachToastOnFailure, randomNickname } = require("../../utils/helpers");

/**
 * Feature: Add New Biller — POSITIVE.
 * Login -> Payees & Billers > Saved Billers -> Add New Biller ->
 * category / biller / template name / amount / reference -> Next -> OTP ->
 * "added successfully" + the new biller shows as the latest record in the list.
 *
 * The save is OTP-gated: after Next, a real OTP is sent to your phone and entered MANUALLY
 * by default (run headed). Set IB_MANUAL_OTP=false to auto-fill the bypass code.
 */
test.describe("Add New Biller - Positive", () => {
  test("TC_BILLER_H01 - Verify that Add a new Dialog biller", async ({ page, loggedInDashboard }) => {
    const biller = new AddBillerPage(page);
    // A unique template name per run so each run adds a distinct, identifiable record.
    const templateName = randomNickname("PW");

    await test.step("Navigate to Payees & Billers > Saved Billers", async () => {
      await loggedInDashboard.goToSavedBillers();
      await biller.assertSavedBillersLoaded();
    });

    await test.step("Open 'Add New Biller' and validate the form", async () => {
      await biller.openAddBiller();
      await biller.assertFormValidations();
    });

    await test.step(`Select the "${newBiller.category}" category and the "${newBiller.biller}" biller`, async () => {
      await biller.selectCategoryAndBiller(newBiller.category, newBiller.biller);
    });

    await test.step(`Fill the template name ("${templateName}"), amount and biller reference`, async () => {
      await biller.fillForm({ ...newBiller, templateName });
    });

    await test.step("Submit and enter the OTP (if requested)", async () => {
      await biller.submit();
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

    await test.step("Validate the success message and the new record in the list", async () => {
      await biller.assertBillerSaved(templateName);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
