const { test } = require("../../utils/fixtures");
const { ForgotPasswordPage } = require("../../pages/ForgotPasswordPage");
const forgotPassword = require("../../test-data/forgotPassword");
const { attachToastOnFailure } = require("../../utils/helpers");

/**
 * Feature: Forgot Password — NEGATIVE / VALIDATION.
 * Both cases go via the login "Reset" link -> "Using Security Questions" -> step 1.
 */
test.describe("Forgot Password - Negative & Validation", () => {
  test("TC_FPWD_N01 - Unknown username is rejected", async ({ page, loginPage }) => {
    const fpwd = new ForgotPasswordPage(page);

    await test.step("Open Password Reset from the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.goToForgotPassword();
      await fpwd.assertLoaded();
    });

    await test.step("Choose the 'Using Security Questions' reset method", async () => {
      await fpwd.selectSecurityQuestionsMethod();
    });

    await test.step("Enter an unknown username and submit", async () => {
      await fpwd.requestReset({ username: forgotPassword.unknownUsername });
    });

    await test.step("Validate the app rejects the unknown username", async () => {
      await fpwd.assertRejected();
    });
  });

  test("TC_FPWD_N02 - Empty username is blocked with a validation message", async ({ page, loginPage }) => {
    const fpwd = new ForgotPasswordPage(page);

    await test.step("Open Password Reset from the login page", async () => {
      await loginPage.open();
      await loginPage.assertLoaded();
      await loginPage.goToForgotPassword();
      await fpwd.assertLoaded();
    });

    await test.step("Choose the 'Using Security Questions' reset method", async () => {
      await fpwd.selectSecurityQuestionsMethod();
    });

    await test.step("Submit with the username left empty", async () => {
      await fpwd.submitEmptyUsername();
    });

    await test.step("Validate the app blocks it and stays on the username step", async () => {
      await fpwd.assertEmptyUsernameRejected();
    });
  });

  test.afterEach(async ({ page }, testInfo) => attachToastOnFailure(page, testInfo));
});
