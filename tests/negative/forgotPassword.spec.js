const { test, expect } = require("../../utils/fixtures");
const { ForgotPasswordPage } = require("../../pages/ForgotPasswordPage");
const { forgotPassword } = require("../../test-data/testData");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Forgot Password — NEGATIVE / VALIDATION.
 */
test.describe("Forgot Password - Negative & Validation", () => {
  test("TC_FPWD_N01 - Unknown username is rejected", async ({ page, loginPage }) => {
    const fpwd = new ForgotPasswordPage(page);

    await test.step("Open Forgot Password from the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.goToForgotPassword();
      await fpwd.assertLoaded();
    });

    await test.step("Enter an unknown username and submit", async () => {
      await fpwd.requestReset({ username: forgotPassword.unknownUsername });
    });

    await test.step("Validate the app rejects the unknown username", async () => {
      await fpwd.assertRejected();
    });
  });

  test("TC_FPWD_N02 - Submit is disabled with an empty username", async ({ page, loginPage }) => {
    const fpwd = new ForgotPasswordPage(page);

    await test.step("Open Forgot Password from the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.goToForgotPassword();
      await fpwd.assertLoaded();
    });

    await test.step("With the username empty, Submit must be disabled", async () => {
      await expect(fpwd.submitButton, "Submit should stay disabled until a username is entered").toBeDisabled({
        timeout: 10_000,
      });
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
