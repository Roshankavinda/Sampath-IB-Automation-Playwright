const { test } = require("../../utils/fixtures");
const { AddPayeePage } = require("../../pages/AddPayeePage");
const { ConfirmationPopup } = require("../../pages/ConfirmationPopup");
const { credentials } = require("../../test-data/accounts");
const newPayee = require("../../test-data/newPayee");
const { attachToastOnFailure, randomNickname } = require("../../utils/helpers");

/**
 * Feature: Add New Payee - CARD type — POSITIVE.
 * The payee form's select[name="type"] offers "Account" and "Card"; the account-type payee is
 * covered by addPayee.spec.js, so this covers the CARD branch.
 * Save is OTP-gated (manual by default - run headed).
 */
test.describe("Add New Payee (Card) - Positive", () => {
  test("TC_PAYEE_H02 - Verify that a card payee can be added", async ({ page, loggedInDashboard }) => {
    const payee = new AddPayeePage(page);
    const nickName = randomNickname("PWC");
    const data = { ...newPayee.cardPayee, nickName };

    await test.step("Navigate to Payees & Billers > Saved Payees", async () => {
      await loggedInDashboard.goToSavedPayees();
      await payee.assertSavedPayeesLoaded();
    });

    await test.step("Open 'Add New Payee' and choose the Card type", async () => {
      await payee.openAddPayee();
      await payee.assertFormValidations();
      await payee.fillForm(data);
    });

    await test.step("Submit and enter the OTP (if requested)", async () => {
      await payee.submit();
      const popup = new ConfirmationPopup(page);
      const otp = await popup.otpBoxes.first().waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
      if (otp) await popup.enterOtpAndConfirm(credentials.otp);
    });

    await test.step("Validate the card payee is saved", async () => {
      await payee.assertPayeeSaved(nickName);
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
